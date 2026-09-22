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
