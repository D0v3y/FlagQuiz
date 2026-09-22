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
// including the correct code and 3 distinct random wrong codes.
function buildChoiceOptions(correctCode) {
  const wrongCodes = sample(
    COUNTRIES.map((c) => c.code),
    3,
    [correctCode]
  );
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
  // mode is 'choice', or raw text when mode is 'type'.
  answer(input) {
    const country = getCountryByCode(this.currentCode);
    const correct =
      this.mode === "choice" ? input === this.currentCode : isAnswerAccepted(country, input);

    if (correct) {
      this.correctCount++;
    } else {
      this.wrongCount++;
      this.failed.push(this.currentCode);
    }
    return { correct, country };
  }

  advance() {
    this.index++;
  }
}
