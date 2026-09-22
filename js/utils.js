// Small shared helpers used across the app.

function normalizeAnswer(str) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sample(array, n, exclude) {
  const excludeSet = new Set(exclude || []);
  const pool = array.filter((x) => !excludeSet.has(x));
  return shuffle(pool).slice(0, n);
}

function flagSrc(code) {
  return `assets/flags/${code.toLowerCase()}.svg`;
}
