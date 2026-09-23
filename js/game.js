// Core quiz game logic, independent of the DOM.

function getCountryByCode(code) {
  return COUNTRIES.find((c) => c.code === code);
}

function isAnswerAccepted(country, rawInput) {
  const normalized = normalizeAnswer(rawInput);
  if (!normalized) return false;
  const accepted = [country.name, ...country.aliases].map(normalizeAnswer);
  return accepted.includes(normalized);
}

// Builds 4 shuffled answer options (country codes) for a multiple-choice task,
// including the correct code and 3 distinct wrong codes. At least `minFromStack`
// (0-3) of the wrong codes are drawn from `stackCodes` (the current stack).
// The requirement is disregarded when the stack isn't big enough to satisfy it
// (needs at least minFromStack + 1 distinct codes, i.e. the correct answer plus
// that many other stack members) — in that case wrong answers are drawn from
// the full country list instead.
function buildChoiceOptions(correctCode, stackCodes, minFromStack) {
  const uniqueStack = Array.from(new Set(stackCodes || []));
  const stackWrongCandidates = uniqueStack.filter((c) => c !== correctCode);

  const requestedN = Math.max(0, Math.min(3, minFromStack || 0));
  const effectiveN = uniqueStack.length >= requestedN + 1 ? requestedN : 0;

  const fromStack = effectiveN > 0 ? sample(stackWrongCandidates, effectiveN) : [];
  const otherWrong = sample(
    COUNTRIES.map((c) => c.code),
    3 - fromStack.length,
    [correctCode, ...fromStack]
  );
  const wrongCodes = [...fromStack, ...otherWrong];
  return shuffle([correctCode, ...wrongCodes]);
}

class QuizGame {
  constructor(codes, mode) {
    this.mode = mode; // 'choice' | 'type'
    this.tasks = shuffle(codes);
    this.index = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.failed = [];
    // One entry per answered task: { code, correct, answerGiven, timeLimitSeconds,
    // timeTakenSeconds, timedOut }. `answerGiven` is only set for wrong answers —
    // the chosen country code (choice mode), the raw typed text (type mode), or
    // null for a timeout. The timing fields are only present when a task time
    // limit was in effect. All of this feeds the session/stats log.
    this.log = [];
  }

  get total() {
    return this.tasks.length;
  }

  get currentCode() {
    return this.tasks[this.index];
  }

  get isDone() {
    return this.index >= this.tasks.length;
  }

  // Records an answer for the current task. `input` is a country code when
  // mode is 'choice', or raw text when mode is 'type'. `meta` may carry
  // { timeLimitSeconds, timeTakenSeconds, timedOut } from the caller — a
  // timed-out task is always scored wrong regardless of `input`.
  answer(input, meta) {
    meta = meta || {};
    const country = getCountryByCode(this.currentCode);
    const correct = meta.timedOut
      ? false
      : this.mode === "choice"
      ? input === this.currentCode
      : isAnswerAccepted(country, input);

    const logEntry = { code: this.currentCode, correct, ...meta };
    if (correct) {
      this.correctCount++;
    } else {
      this.wrongCount++;
      this.failed.push(this.currentCode);
      logEntry.answerGiven = meta.timedOut ? null : input;
    }
    this.log.push(logEntry);
    return { correct, country };
  }

  advance() {
    this.index++;
  }
}
