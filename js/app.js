// App controller: screen navigation, event wiring, and rendering.
// Depends on: data/countries.js, js/utils.js, js/storage.js, js/game.js, js/icons.js

(function () {
  "use strict";

  // ---------- Screen navigation ----------

  const screens = document.querySelectorAll(".screen");
  function showScreen(id) {
    screens.forEach((s) => s.classList.toggle("active", s.id === id));
  }

  // ---------- Start screen ----------

  document.getElementById("btn-go-game").addEventListener("click", () => {
    enterSetupScreen();
  });
  document.getElementById("btn-go-wiki").addEventListener("click", () => {
    renderWiki();
    showScreen("screen-wiki");
  });
  document.getElementById("btn-go-options").addEventListener("click", () => {
    showScreen("screen-options");
  });
  document.getElementById("btn-wiki-back").addEventListener("click", () => {
    showScreen("screen-start");
  });
  document.getElementById("btn-options-back").addEventListener("click", () => {
    showScreen("screen-start");
  });

  // ---------- Game setup screen ----------

  const stackSelect = document.getElementById("stack-select");
  const btnEditStack = document.getElementById("btn-edit-stack");
  const btnStartGame = document.getElementById("btn-start-game");
  const modeTiles = document.querySelectorAll(".mode-tile");

  let selectedMode = null;

  btnEditStack.innerHTML = ICONS.pencil;

  function populateStackSelect(selectId) {
    const allStack = getAllCountriesStack();
    const customStacks = getCustomStacks();
    stackSelect.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = allStack.id;
    allOption.textContent = allStack.name;
    stackSelect.appendChild(allOption);

    customStacks.forEach((stack) => {
      const opt = document.createElement("option");
      opt.value = stack.id;
      opt.textContent = stack.name;
      stackSelect.appendChild(opt);
    });

    stackSelect.value = selectId && getStackById(selectId) ? selectId : ALL_STACK_ID;
  }

  function enterSetupScreen() {
    populateStackSelect(stackSelect.value || ALL_STACK_ID);
    showScreen("screen-setup");
  }

  document.getElementById("btn-setup-back").addEventListener("click", () => {
    showScreen("screen-start");
  });

  modeTiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      modeTiles.forEach((t) => t.classList.remove("selected"));
      tile.classList.add("selected");
      selectedMode = tile.dataset.mode;
      btnStartGame.disabled = false;
    });
  });

  btnEditStack.addEventListener("click", () => {
    const currentId = stackSelect.value;
    if (currentId === ALL_STACK_ID) {
      openEditor(null);
    } else {
      openEditor(getStackById(currentId));
    }
  });

  btnStartGame.addEventListener("click", () => {
    const stack = getStackById(stackSelect.value) || getAllCountriesStack();
    if (!selectedMode || !stack.codes.length) return;
    startGame(stack.codes, selectedMode);
  });

  // ---------- Custom stack editor ----------

  const editorTitle = document.getElementById("editor-title");
  const editorList = document.getElementById("editor-list");
  const editorNameInput = document.getElementById("editor-name-input");
  const editorError = document.getElementById("editor-error");
  const btnEditorSave = document.getElementById("btn-editor-save");
  const btnEditorDelete = document.getElementById("btn-editor-delete");
  const btnEditorClose = document.getElementById("btn-editor-close");

  btnEditorSave.innerHTML = ICONS.save;
  btnEditorDelete.innerHTML = ICONS.trash;
  btnEditorClose.innerHTML = ICONS.close;

  let editingStackId = null;
  let editorSelectedCodes = new Set();
  const editorCheckboxes = new Map();

  function openEditor(stack) {
    editingStackId = stack ? stack.id : null;
    editorSelectedCodes = new Set(stack ? stack.codes : []);
    editorNameInput.value = stack ? stack.name : "";
    editorError.textContent = "";
    editorTitle.textContent = stack ? "Edit Stack" : "Create Stack";
    btnEditorDelete.hidden = !stack;

    renderEditorList();
    updateSaveButtonState();
    showScreen("screen-editor");
  }

  function renderEditorList() {
    editorList.innerHTML = "";
    editorCheckboxes.clear();

    const sorted = COUNTRIES.slice().sort((a, b) => a.name.localeCompare(b.name));
    const fragment = document.createDocumentFragment();

    sorted.forEach((country) => {
      const row = document.createElement("label");
      row.className = "editor-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = editorSelectedCodes.has(country.code);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) editorSelectedCodes.add(country.code);
        else editorSelectedCodes.delete(country.code);
        updateSaveButtonState();
      });

      const flag = document.createElement("img");
      flag.className = "editor-item-flag";
      flag.src = flagSrc(country.code);
      flag.alt = "";

      const name = document.createElement("span");
      name.className = "editor-item-name";
      name.textContent = country.name;

      row.appendChild(checkbox);
      row.appendChild(flag);
      row.appendChild(name);
      fragment.appendChild(row);

      editorCheckboxes.set(country.code, checkbox);
    });

    editorList.appendChild(fragment);
  }

  document.getElementById("btn-select-all").addEventListener("click", () => {
    editorSelectedCodes = new Set(COUNTRIES.map((c) => c.code));
    editorCheckboxes.forEach((cb) => (cb.checked = true));
    updateSaveButtonState();
  });

  document.getElementById("btn-deselect-all").addEventListener("click", () => {
    editorSelectedCodes.clear();
    editorCheckboxes.forEach((cb) => (cb.checked = false));
    updateSaveButtonState();
  });

  function updateSaveButtonState() {
    const name = editorNameInput.value.trim();
    const hasName = name.length > 0;
    const hasTasks = editorSelectedCodes.size > 0;
    const nameTaken = hasName && isStackNameTaken(name, editingStackId);

    editorError.textContent = nameTaken ? "That name is already used by another stack." : "";
    btnEditorSave.disabled = !hasName || !hasTasks || nameTaken;
  }

  editorNameInput.addEventListener("input", updateSaveButtonState);

  btnEditorSave.addEventListener("click", () => {
    if (btnEditorSave.disabled) return;
    const stack = upsertCustomStack({
      id: editingStackId,
      name: editorNameInput.value,
      codes: Array.from(editorSelectedCodes),
    });
    populateStackSelect(stack.id);
    showScreen("screen-setup");
  });

  btnEditorDelete.addEventListener("click", () => {
    if (!editingStackId) return;
    const confirmed = window.confirm("Delete this stack? This cannot be undone.");
    if (!confirmed) return;
    deleteCustomStack(editingStackId);
    populateStackSelect(ALL_STACK_ID);
    showScreen("screen-setup");
  });

  btnEditorClose.addEventListener("click", () => {
    showScreen("screen-setup");
  });

  // ---------- Game play ----------

  const progressLabel = document.getElementById("progress-label");
  const playBodyEl = document.getElementById("play-body");
  const playFlag = document.getElementById("play-flag");
  const choiceAnswersEl = document.getElementById("choice-answers");
  const typeAnswerEl = document.getElementById("type-answer");
  const typeInput = document.getElementById("type-input");
  const btnTypeSubmit = document.getElementById("btn-type-submit");
  const feedbackBanner = document.getElementById("feedback-banner");
  const feedbackText = document.getElementById("feedback-text");
  const btnPlayQuit = document.getElementById("btn-play-quit");
  const playScreenEl = document.getElementById("screen-play");

  let currentGame = null;
  let isShowingFeedback = false;
  let feedbackTimerId = null;

  function startGame(codes, mode) {
    currentGame = new QuizGame(codes, mode);
    isShowingFeedback = false;
    showScreen("screen-play");
    renderTask();
  }

  function renderTask() {
    const country = getCountryByCode(currentGame.currentCode);
    progressLabel.textContent = `${currentGame.index + 1} / ${currentGame.total}`;
    playFlag.src = flagSrc(country.code);
    playFlag.alt = "";

    feedbackBanner.hidden = true;
    feedbackBanner.className = "feedback-banner";
    playBodyEl.classList.remove("locked");

    if (currentGame.mode === "choice") {
      choiceAnswersEl.hidden = false;
      typeAnswerEl.hidden = true;
      renderChoiceAnswers(country);
    } else {
      choiceAnswersEl.hidden = true;
      typeAnswerEl.hidden = false;
      typeInput.value = "";
      typeInput.focus();
    }
  }

  function renderChoiceAnswers(correctCountry) {
    choiceAnswersEl.innerHTML = "";
    const optionCodes = buildChoiceOptions(correctCountry.code);
    optionCodes.forEach((code) => {
      const country = getCountryByCode(code);
      const tile = document.createElement("button");
      tile.className = "choice-tile";
      tile.type = "button";
      tile.textContent = country.name;
      tile.dataset.code = code;
      tile.addEventListener("click", (e) => {
        e.stopPropagation();
        handleChoiceAnswer(code);
      });
      choiceAnswersEl.appendChild(tile);
    });
  }

  function handleChoiceAnswer(chosenCode) {
    if (isShowingFeedback) return;
    const result = currentGame.answer(chosenCode);
    Array.from(choiceAnswersEl.children).forEach((tile) => {
      if (tile.dataset.code === result.country.code) {
        tile.classList.add("correct");
      } else if (tile.dataset.code === chosenCode && !result.correct) {
        tile.classList.add("wrong");
      }
    });
    showFeedback(result);
  }

  btnTypeSubmit.addEventListener("click", (e) => {
    e.stopPropagation();
    submitTypeAnswer();
  });
  typeInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (isShowingFeedback) return; // let it bubble up to the skip-ahead listener
    e.stopPropagation();
    submitTypeAnswer();
  });

  function submitTypeAnswer() {
    if (isShowingFeedback) return;
    const value = typeInput.value;
    const result = currentGame.answer(value);
    showFeedback(result);
  }

  function showFeedback(result) {
    isShowingFeedback = true;
    playBodyEl.classList.add("locked");
    feedbackBanner.hidden = false;
    feedbackBanner.className = "feedback-banner " + (result.correct ? "correct" : "wrong");
    feedbackText.textContent = result.correct ? "Correct!" : `Wrong, it was ${result.country.name}`;

    feedbackTimerId = setTimeout(advanceTask, 1500);
  }

  function skipFeedback() {
    if (!isShowingFeedback) return;
    clearTimeout(feedbackTimerId);
    advanceTask();
  }

  playScreenEl.addEventListener("click", (e) => {
    if (isShowingFeedback) skipFeedback();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && isShowingFeedback && playScreenEl.classList.contains("active")) {
      skipFeedback();
    }
  });

  function advanceTask() {
    isShowingFeedback = false;
    currentGame.advance();
    if (currentGame.isDone) {
      renderResults();
      showScreen("screen-results");
    } else {
      renderTask();
    }
  }

  btnPlayQuit.addEventListener("click", (e) => {
    e.stopPropagation();
    const confirmed = window.confirm("Quit this game? Your progress will be lost.");
    if (!confirmed) return;
    clearTimeout(feedbackTimerId);
    isShowingFeedback = false;
    currentGame = null;
    showScreen("screen-start");
  });

  // ---------- Results screen ----------

  const resultsCorrectNum = document.getElementById("results-correct-num");
  const resultsWrongNum = document.getElementById("results-wrong-num");
  const resultsFailedWrap = document.getElementById("results-failed-wrap");
  const resultsFailedList = document.getElementById("results-failed-list");
  const btnRetryFailed = document.getElementById("btn-retry-failed");
  const btnResultsBack = document.getElementById("btn-results-back");

  function renderResults() {
    resultsCorrectNum.textContent = currentGame.correctCount;
    resultsWrongNum.textContent = currentGame.wrongCount;

    const failed = currentGame.failed;
    resultsFailedWrap.hidden = failed.length === 0;
    btnRetryFailed.hidden = failed.length === 0;
    resultsFailedList.innerHTML = "";

    failed.forEach((code) => {
      const country = getCountryByCode(code);
      const row = document.createElement("div");
      row.className = "results-failed-item";

      const flag = document.createElement("img");
      flag.className = "results-failed-flag";
      flag.src = flagSrc(country.code);
      flag.alt = "";

      const name = document.createElement("span");
      name.textContent = country.name;

      row.appendChild(flag);
      row.appendChild(name);
      resultsFailedList.appendChild(row);
    });
  }

  btnRetryFailed.addEventListener("click", () => {
    const failedCodes = currentGame.failed.slice();
    const mode = currentGame.mode;
    startGame(failedCodes, mode);
  });

  btnResultsBack.addEventListener("click", () => {
    currentGame = null;
    showScreen("screen-start");
  });

  // ---------- Wiki screen ----------

  const wikiGrid = document.getElementById("wiki-grid");

  function renderWiki() {
    if (wikiGrid.childElementCount > 0) return; // render once
    const sorted = COUNTRIES.slice().sort((a, b) => a.name.localeCompare(b.name));
    const fragment = document.createDocumentFragment();

    sorted.forEach((country) => {
      const cell = document.createElement("div");
      cell.className = "wiki-cell";

      const flag = document.createElement("img");
      flag.className = "wiki-flag";
      flag.src = flagSrc(country.code);
      flag.alt = "";

      const name = document.createElement("span");
      name.className = "wiki-name";
      name.textContent = country.name;

      cell.appendChild(flag);
      cell.appendChild(name);
      fragment.appendChild(cell);
    });

    wikiGrid.appendChild(fragment);
  }
})();
