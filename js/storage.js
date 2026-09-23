// Persistence for custom stacks (localStorage).

const STORAGE_KEY = "flagquiz.customStacks";
const ALL_STACK_ID = "__all__";

function getAllCountriesStack() {
  return {
    id: ALL_STACK_ID,
    name: `All countries (${COUNTRIES.length})`,
    codes: COUNTRIES.map((c) => c.code),
  };
}

function getCustomStacks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveCustomStacks(stacks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
}

function getStackById(id) {
  if (id === ALL_STACK_ID) return getAllCountriesStack();
  return getCustomStacks().find((s) => s.id === id) || null;
}

function isStackNameTaken(name, excludeId) {
  const normalized = name.trim().toLowerCase();
  if (normalized === "all countries" || normalized === getAllCountriesStack().name.toLowerCase()) {
    return true;
  }
  return getCustomStacks().some(
    (s) => s.id !== excludeId && s.name.trim().toLowerCase() === normalized
  );
}

function generateStackId() {
  return `stack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Creates a new stack or updates an existing one (matched by id).
function upsertCustomStack({ id, name, codes }) {
  const stacks = getCustomStacks();
  const trimmedName = name.trim();
  if (id) {
    const idx = stacks.findIndex((s) => s.id === id);
    if (idx !== -1) {
      stacks[idx] = { id, name: trimmedName, codes };
      saveCustomStacks(stacks);
      return stacks[idx];
    }
  }
  const newStack = { id: generateStackId(), name: trimmedName, codes };
  stacks.push(newStack);
  saveCustomStacks(stacks);
  return newStack;
}

function deleteCustomStack(id) {
  const stacks = getCustomStacks().filter((s) => s.id !== id);
  saveCustomStacks(stacks);
}

// Persistence for app-wide settings (Options screen).

const OPTIONS_KEY = "flagquiz.options";
const DEFAULT_OPTIONS = {
  minWrongFromStack: 1,
  autosuggestEnabled: true,
  autosuggestMinLetters: 2,
  loggingEnabled: true,
  timeLimitEnabled: false,
  timeLimitSeconds: 10,
};

function getOptions() {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (!raw) return { ...DEFAULT_OPTIONS };
    return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_OPTIONS };
  }
}

function saveOptions(options) {
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
}

// Persistence for the session log and per-country stats (Stats screen).

const SESSION_LOG_KEY = "flagquiz.sessionLog";
const COUNTRY_STATS_KEY = "flagquiz.countryStats";
const MAX_SESSION_LOG_ENTRIES = 200;
const MAX_WRONG_ANSWERS_PER_COUNTRY = 20;

function getSessionLog() {
  try {
    const raw = localStorage.getItem(SESSION_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Appends one entry for a finished (or quit-early) game session.
function appendSessionLogEntry(entry) {
  const log = getSessionLog();
  log.push(entry);
  while (log.length > MAX_SESSION_LOG_ENTRIES) log.shift();
  localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(log));
}

function getCountryStats() {
  try {
    const raw = localStorage.getItem(COUNTRY_STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

// Records one attempt at a country's task. `wrongDetail`, when the attempt
// was wrong, is { timestamp, sessionId, mode, questionType, answerGiven }.
function recordCountryAttempt(code, correct, wrongDetail) {
  const stats = getCountryStats();
  if (!stats[code]) {
    stats[code] = { attempts: 0, correct: 0, wrongAnswers: [] };
  }
  stats[code].attempts++;
  if (correct) {
    stats[code].correct++;
  } else if (wrongDetail) {
    stats[code].wrongAnswers.push(wrongDetail);
    while (stats[code].wrongAnswers.length > MAX_WRONG_ANSWERS_PER_COUNTRY) {
      stats[code].wrongAnswers.shift();
    }
  }
  localStorage.setItem(COUNTRY_STATS_KEY, JSON.stringify(stats));
}

function clearSessionLog() {
  localStorage.removeItem(SESSION_LOG_KEY);
}

function clearCountryStats() {
  localStorage.removeItem(COUNTRY_STATS_KEY);
}
