// App controller: screen navigation, event wiring, and rendering.
// Depends on: data/countries.js, js/utils.js, js/storage.js, js/game.js, js/icons.js

(function () {
  "use strict";

  // ---------- Screen navigation ----------

  const screens = document.querySelectorAll(".screen");

  // Mobile back button/gesture handling: this is a single HTML page, so the
  // phone's back button/gesture would otherwise leave the page entirely.
  // Invariant: a history "trap" entry is armed whenever we're on any screen
  // other than start, and absent while on start. Forward navigation (via
  // showScreen) arms it; popping it re-runs whichever back/quit/close action
  // the current screen's own button performs (reusing that exact handler, so
  // e.g. a mid-game quit still asks for confirmation) instead of leaving.
  let trapArmed = false;

  function pushHistoryTrap() {
    history.pushState({ flagQuizBackTrap: true }, "", "");
    trapArmed = true;
  }

  function syncBackTrap(id) {
    if (id === "screen-start") {
      trapArmed = false;
    } else if (!trapArmed) {
      pushHistoryTrap();
    }
  }

  function showScreen(id) {
    screens.forEach((s) => s.classList.toggle("active", s.id === id));
    syncBackTrap(id);
  }

  window.addEventListener("popstate", () => {
    trapArmed = false; // this pop just consumed whatever trap was armed

    const activeScreen = document.querySelector(".screen.active");
    const activeId = activeScreen ? activeScreen.id : "screen-start";
    if (activeId === "screen-start") return; // already at root; let the real back-nav happen

    switch (activeId) {
      case "screen-editor":
        showScreen("screen-setup");
        break;
      case "screen-play":
        performQuit();
        break;
      case "screen-results":
        performResultsBack();
        break;
      case "screen-setup":
      case "screen-wiki":
      case "screen-options":
      case "screen-stats":
        showScreen("screen-start");
        break;
    }

    // Safety net for actions that don't navigate at all — e.g. a declined
    // quit confirmation leaves us on screen-play with no navigation.
    const nowActive = document.querySelector(".screen.active");
    if (nowActive) syncBackTrap(nowActive.id);
  });

  // ---------- Start screen ----------

  document.getElementById("btn-go-game").addEventListener("click", () => {
    enterSetupScreen();
  });
  document.getElementById("btn-go-wiki").addEventListener("click", () => {
    renderWiki();
    showScreen("screen-wiki");
  });
  document.getElementById("btn-go-options").addEventListener("click", () => {
    syncOptionsUI();
    showScreen("screen-options");
  });
  document.getElementById("btn-wiki-back").addEventListener("click", () => {
    history.back();
  });
  document.getElementById("btn-options-back").addEventListener("click", () => {
    history.back();
  });
  document.getElementById("btn-go-stats").addEventListener("click", () => {
    renderStatsScreen();
    showScreen("screen-stats");
  });
  document.getElementById("btn-stats-back").addEventListener("click", () => {
    history.back();
  });

  // ---------- Options screen ----------

  const optionMinWrongSelect = document.getElementById("option-min-wrong-from-stack");
  const optionAutosuggestEnabled = document.getElementById("option-autosuggest-enabled");
  const optionAutosuggestMinLetters = document.getElementById("option-autosuggest-min-letters");
  const optionLoggingEnabled = document.getElementById("option-logging-enabled");
  const optionTimeLimitEnabled = document.getElementById("option-time-limit-enabled");
  const optionTimeLimitSeconds = document.getElementById("option-time-limit-seconds");

  function syncOptionsUI() {
    const options = getOptions();
    optionMinWrongSelect.value = String(options.minWrongFromStack);
    optionAutosuggestEnabled.checked = options.autosuggestEnabled;
    optionAutosuggestMinLetters.value = String(options.autosuggestMinLetters);
    optionAutosuggestMinLetters.disabled = !options.autosuggestEnabled;
    optionLoggingEnabled.checked = options.loggingEnabled;
    optionTimeLimitEnabled.checked = options.timeLimitEnabled;
    optionTimeLimitSeconds.value = String(options.timeLimitSeconds);
    optionTimeLimitSeconds.disabled = !options.timeLimitEnabled;
  }
  syncOptionsUI();

  optionMinWrongSelect.addEventListener("change", () => {
    const options = getOptions();
    options.minWrongFromStack = parseInt(optionMinWrongSelect.value, 10);
    saveOptions(options);
  });

  optionAutosuggestEnabled.addEventListener("change", () => {
    const options = getOptions();
    options.autosuggestEnabled = optionAutosuggestEnabled.checked;
    saveOptions(options);
    optionAutosuggestMinLetters.disabled = !options.autosuggestEnabled;
  });

  optionAutosuggestMinLetters.addEventListener("change", () => {
    const options = getOptions();
    options.autosuggestMinLetters = parseInt(optionAutosuggestMinLetters.value, 10);
    saveOptions(options);
  });

  optionLoggingEnabled.addEventListener("change", () => {
    const options = getOptions();
    options.loggingEnabled = optionLoggingEnabled.checked;
    saveOptions(options);
  });

  optionTimeLimitEnabled.addEventListener("change", () => {
    const options = getOptions();
    options.timeLimitEnabled = optionTimeLimitEnabled.checked;
    saveOptions(options);
    optionTimeLimitSeconds.disabled = !options.timeLimitEnabled;
  });

  optionTimeLimitSeconds.addEventListener("change", () => {
    const options = getOptions();
    const seconds = Math.max(1, Math.min(120, parseInt(optionTimeLimitSeconds.value, 10) || 10));
    optionTimeLimitSeconds.value = String(seconds);
    options.timeLimitSeconds = seconds;
    saveOptions(options);
  });

  // ---------- Game setup screen ----------

  const stackSelect = document.getElementById("stack-select");
  const btnEditStack = document.getElementById("btn-edit-stack");
  const btnStartGame = document.getElementById("btn-start-game");
  const modeTiles = document.querySelectorAll(".mode-tile");
  const questionTypeSwitch = document.getElementById("question-type-switch");
  const typeModeTile = document.querySelector('.mode-tile[data-mode="type"]');
  const setupLoggingWarning = document.getElementById("setup-logging-warning");

  let selectedMode = null;

  btnEditStack.innerHTML = ICONS.pencil;

  questionTypeSwitch.addEventListener("change", () => {
    const isFlagMode = questionTypeSwitch.checked;
    typeModeTile.classList.toggle("disabled", isFlagMode);
    if (isFlagMode && selectedMode === "type") {
      selectedMode = null;
      modeTiles.forEach((t) => t.classList.remove("selected"));
      btnStartGame.disabled = true;
    }
  });

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
    setupLoggingWarning.hidden = getOptions().loggingEnabled;
    showScreen("screen-setup");
  }

  document.getElementById("btn-setup-back").addEventListener("click", () => {
    history.back();
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
    currentQuestionType = questionTypeSwitch.checked ? "flag" : "country";
    currentStackId = stack.id;
    currentStackName = stack.name;
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
    history.back();
  });

  // ---------- Game play ----------

  const progressLabel = document.getElementById("progress-label");
  const timeLimitLabel = document.getElementById("time-limit-label");
  const playBodyEl = document.getElementById("play-body");
  const playFlag = document.getElementById("play-flag");
  const playPromptName = document.getElementById("play-prompt-name");
  const choiceAnswersEl = document.getElementById("choice-answers");
  const typeAnswerEl = document.getElementById("type-answer-wrap");
  const typeInput = document.getElementById("type-input");
  const btnTypeSubmit = document.getElementById("btn-type-submit");
  const autosuggestList = document.getElementById("autosuggest-list");
  const feedbackBanner = document.getElementById("feedback-banner");
  const feedbackText = document.getElementById("feedback-text");
  const btnPlayQuit = document.getElementById("btn-play-quit");
  const playScreenEl = document.getElementById("screen-play");

  let currentGame = null;
  let currentQuestionType = "country"; // 'country' | 'flag'
  let currentStackId = null;
  let currentStackName = null;
  let isShowingFeedback = false;
  let feedbackTimerId = null;

  // Per-task time limit (Options: "Enable time limit per task").
  let taskTimerIntervalId = null;
  let taskTimeLimitSeconds = null; // configured limit for the current task, or null when off
  let taskStartTimestamp = null;
  let taskRemainingSeconds = null;

  function startGame(codes, mode) {
    currentGame = new QuizGame(codes, mode);
    isShowingFeedback = false;
    showScreen("screen-play");
    renderTask();
  }

  function startTaskTimer() {
    const options = getOptions();
    if (!options.timeLimitEnabled) {
      taskTimeLimitSeconds = null;
      timeLimitLabel.hidden = true;
      return;
    }
    taskTimeLimitSeconds = Math.max(1, options.timeLimitSeconds || 10);
    taskStartTimestamp = performance.now();
    taskRemainingSeconds = taskTimeLimitSeconds;

    timeLimitLabel.hidden = false;
    timeLimitLabel.classList.remove("time-limit-warning");
    timeLimitLabel.textContent = `${taskRemainingSeconds}s`;

    taskTimerIntervalId = setInterval(() => {
      taskRemainingSeconds -= 1;
      if (taskRemainingSeconds <= 0) {
        timeLimitLabel.textContent = "0s";
        clearTaskTimer();
        handleTaskTimeout();
      } else {
        timeLimitLabel.textContent = `${taskRemainingSeconds}s`;
        timeLimitLabel.classList.toggle("time-limit-warning", taskRemainingSeconds <= 3);
      }
    }, 1000);
  }

  function clearTaskTimer() {
    if (taskTimerIntervalId) {
      clearInterval(taskTimerIntervalId);
      taskTimerIntervalId = null;
    }
  }

  // Timing metadata for the log: only present when a time limit was in effect
  // for this task. Call before `taskStartTimestamp` is overwritten by the
  // next task's timer.
  function getTaskTimingMeta() {
    if (taskTimeLimitSeconds === null) return {};
    const timeTakenSeconds = Math.round(((performance.now() - taskStartTimestamp) / 1000) * 100) / 100;
    return { timeLimitSeconds: taskTimeLimitSeconds, timeTakenSeconds };
  }

  function handleTaskTimeout() {
    if (isShowingFeedback) return;
    const meta = { timeLimitSeconds: taskTimeLimitSeconds, timeTakenSeconds: taskTimeLimitSeconds, timedOut: true };
    const result = currentGame.answer(currentGame.mode === "choice" ? "" : "", meta);
    if (currentGame.mode === "choice") {
      Array.from(choiceAnswersEl.children).forEach((tile) => {
        if (tile.dataset.code === result.country.code) tile.classList.add("correct");
      });
    }
    hideSuggestions();
    showFeedback(result, true);
  }

  function renderTask() {
    const country = getCountryByCode(currentGame.currentCode);
    progressLabel.textContent = `${currentGame.index + 1} / ${currentGame.total}`;

    if (currentQuestionType === "flag") {
      playFlag.hidden = true;
      playPromptName.hidden = false;
      playPromptName.textContent = country.name;
    } else {
      playPromptName.hidden = true;
      playFlag.hidden = false;
      playFlag.src = flagSrc(country.code);
      playFlag.alt = "";
    }

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
      hideSuggestions();
    }

    startTaskTimer();
  }

  function renderChoiceAnswers(correctCountry) {
    choiceAnswersEl.innerHTML = "";
    const optionCodes = buildChoiceOptions(
      correctCountry.code,
      currentGame.tasks,
      getOptions().minWrongFromStack
    );
    optionCodes.forEach((code) => {
      const country = getCountryByCode(code);
      const tile = document.createElement("button");
      tile.className = "choice-tile";
      tile.type = "button";
      tile.dataset.code = code;

      if (currentQuestionType === "flag") {
        tile.classList.add("choice-tile-flag");
        const img = document.createElement("img");
        img.className = "choice-tile-flag-img";
        img.src = flagSrc(code);
        img.alt = ""; // decorative: the flag itself is the answer being guessed
        tile.appendChild(img);
      } else {
        tile.textContent = country.name;
      }

      tile.addEventListener("click", (e) => {
        e.stopPropagation();
        handleChoiceAnswer(code);
      });
      choiceAnswersEl.appendChild(tile);
    });
  }

  function handleChoiceAnswer(chosenCode) {
    if (isShowingFeedback) return;
    clearTaskTimer();
    const result = currentGame.answer(chosenCode, getTaskTimingMeta());
    Array.from(choiceAnswersEl.children).forEach((tile) => {
      if (tile.dataset.code === result.country.code) {
        tile.classList.add("correct");
      } else if (tile.dataset.code === chosenCode && !result.correct) {
        tile.classList.add("wrong");
      }
    });
    showFeedback(result);
  }

  // ---------- Autosuggest (Type the Answer) ----------

  function hideSuggestions() {
    autosuggestList.hidden = true;
    autosuggestList.innerHTML = "";
  }

  function renderSuggestions(matches) {
    autosuggestList.innerHTML = "";
    matches.forEach((country) => {
      const item = document.createElement("li");
      item.className = "autosuggest-item";
      item.textContent = country.name;
      // mousedown (not click) + preventDefault so the input never blurs
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        typeInput.value = country.name;
        hideSuggestions();
        typeInput.focus();
      });
      autosuggestList.appendChild(item);
    });
    autosuggestList.hidden = false;
  }

  function updateAutosuggest() {
    const options = getOptions();
    if (!options.autosuggestEnabled) {
      hideSuggestions();
      return;
    }
    const normalizedValue = normalizeAnswer(typeInput.value);
    const minLetters = options.autosuggestMinLetters || 1;
    if (normalizedValue.length < minLetters) {
      hideSuggestions();
      return;
    }
    const matches = COUNTRIES.filter((c) => normalizeAnswer(c.name).startsWith(normalizedValue)).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
    if (matches.length === 0) {
      hideSuggestions();
      return;
    }
    renderSuggestions(matches);
  }

  typeInput.addEventListener("input", updateAutosuggest);
  typeInput.addEventListener("blur", hideSuggestions);

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
    clearTaskTimer();
    const value = typeInput.value;
    hideSuggestions();
    const result = currentGame.answer(value, getTaskTimingMeta());
    showFeedback(result);
  }

  function showFeedback(result, timedOut) {
    isShowingFeedback = true;
    hideSuggestions();
    playBodyEl.classList.add("locked");
    feedbackBanner.hidden = false;
    feedbackBanner.className = "feedback-banner " + (result.correct ? "correct" : "wrong");
    feedbackText.textContent = result.correct
      ? "Correct!"
      : timedOut
      ? `Time's up! It was ${result.country.name}`
      : `Wrong, it was ${result.country.name}`;

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
      recordSession(true);
      renderResults();
      showScreen("screen-results");
    } else {
      renderTask();
    }
  }

  // Logs the current game as one session, and folds each answered task into
  // the per-country stats (attempts/correct, plus what was answered when
  // wrong, and — when a time limit was active — the limit and how long the
  // task took). No-ops entirely when stats logging is disabled in Options.
  function recordSession(completed) {
    if (!getOptions().loggingEnabled) return;
    if (!currentGame || currentGame.log.length === 0) return;
    const timestamp = Date.now();
    const entry = {
      id: `session_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      stackId: currentStackId,
      stackName: currentStackName,
      mode: currentGame.mode,
      questionType: currentQuestionType,
      total: currentGame.log.length,
      correct: currentGame.correctCount,
      wrong: currentGame.wrongCount,
      completed,
      tasks: currentGame.log.map((t) => ({
        code: t.code,
        correct: t.correct,
        answerGiven: t.answerGiven,
        timeLimitSeconds: t.timeLimitSeconds,
        timeTakenSeconds: t.timeTakenSeconds,
        timedOut: t.timedOut,
      })),
    };
    appendSessionLogEntry(entry);

    currentGame.log.forEach((t) => {
      recordCountryAttempt(
        t.code,
        t.correct,
        t.correct
          ? null
          : {
              timestamp,
              sessionId: entry.id,
              mode: currentGame.mode,
              questionType: currentQuestionType,
              answerGiven: t.answerGiven,
              timeLimitSeconds: t.timeLimitSeconds,
              timeTakenSeconds: t.timeTakenSeconds,
              timedOut: t.timedOut,
            }
      );
    });
  }

  btnPlayQuit.addEventListener("click", (e) => {
    e.stopPropagation();
    history.back();
  });

  // Shared by the Quit button and the popstate back handler (hardware back
  // button/gesture) so both paths get the exact same confirmation + cleanup.
  function performQuit() {
    const confirmed = window.confirm("Quit this game? Your progress will be lost.");
    if (!confirmed) return;
    clearTimeout(feedbackTimerId);
    clearTaskTimer();
    isShowingFeedback = false;
    recordSession(false);
    currentGame = null;
    showScreen("screen-start");
  }

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
    history.back();
  });

  // Shared by the "Back to start" button and the popstate back handler.
  function performResultsBack() {
    currentGame = null;
    showScreen("screen-start");
  }

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

  // ---------- Stats screen ----------

  const statsTabs = document.querySelectorAll(".stats-tab");
  const statsCountriesPanel = document.getElementById("stats-countries-panel");
  const statsSessionsPanel = document.getElementById("stats-sessions-panel");
  const statsCountriesList = document.getElementById("stats-countries-list");
  const statsSessionsList = document.getElementById("stats-sessions-list");
  const btnStatsClear = document.getElementById("btn-stats-clear");

  btnStatsClear.innerHTML = ICONS.trash;

  statsTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      statsTabs.forEach((t) => t.classList.remove("selected"));
      tab.classList.add("selected");
      const isCountries = tab.dataset.tab === "countries";
      statsCountriesPanel.hidden = !isCountries;
      statsSessionsPanel.hidden = isCountries;
    });
  });

  btnStatsClear.addEventListener("click", () => {
    const confirmed = window.confirm("Clear all stats and session history? This cannot be undone.");
    if (!confirmed) return;
    clearSessionLog();
    clearCountryStats();
    renderStatsScreen();
  });

  function statsRate(correct, attempts) {
    if (!attempts) return null;
    return Math.round((correct / attempts) * 100);
  }

  function statsRateBadgeClass(rate) {
    if (rate === null) return "badge-none";
    if (rate >= 80) return "badge-good";
    if (rate >= 50) return "badge-mid";
    return "badge-bad";
  }

  function statsFormatTimestamp(ts) {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderStatsScreen() {
    renderStatsCountries();
    renderStatsSessions();
  }

  function renderStatsCountries() {
    const stats = getCountryStats();
    const attempted = [];
    const unattempted = [];

    COUNTRIES.forEach((country) => {
      const s = stats[country.code];
      if (s && s.attempts > 0) {
        attempted.push({ country, stat: s, rate: statsRate(s.correct, s.attempts) });
      } else {
        unattempted.push({ country });
      }
    });

    attempted.sort((a, b) => a.rate - b.rate || a.country.name.localeCompare(b.country.name));
    unattempted.sort((a, b) => a.country.name.localeCompare(b.country.name));

    statsCountriesList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    attempted.forEach(({ country, stat, rate }) => fragment.appendChild(buildStatsCountryRow(country, stat, rate)));
    unattempted.forEach(({ country }) => fragment.appendChild(buildStatsCountryRow(country, null, null)));
    statsCountriesList.appendChild(fragment);
  }

  function buildStatsCountryRow(country, stat, rate) {
    const row = document.createElement("div");
    row.className = "stats-country-row";

    const summary = document.createElement("button");
    summary.type = "button";
    summary.className = "stats-country-summary";

    const flag = document.createElement("img");
    flag.className = "stats-country-flag";
    flag.src = flagSrc(country.code);
    flag.alt = "";

    const name = document.createElement("span");
    name.className = "stats-country-name";
    name.textContent = country.name;

    const badge = document.createElement("span");
    badge.className = "stats-rate-badge " + statsRateBadgeClass(rate);
    badge.textContent = stat ? `${rate}% (${stat.correct}/${stat.attempts})` : "No attempts";

    summary.appendChild(flag);
    summary.appendChild(name);
    summary.appendChild(badge);
    row.appendChild(summary);

    if (stat && stat.wrongAnswers.length > 0) {
      const detail = document.createElement("div");
      detail.className = "stats-country-detail";
      detail.hidden = true;

      const heading = document.createElement("div");
      heading.className = "stats-detail-heading";
      heading.textContent = "Wrong answers";
      detail.appendChild(heading);

      stat.wrongAnswers
        .slice()
        .reverse()
        .forEach((w) => {
          const item = document.createElement("div");
          item.className = "stats-wrong-item";

          const answerCountry = w.mode === "choice" ? getCountryByCode(w.answerGiven) : null;
          const answerText = w.timedOut
            ? "Timed out — no answer"
            : w.mode === "choice"
            ? `Picked: ${answerCountry ? answerCountry.name : w.answerGiven}`
            : `Typed: "${w.answerGiven}"`;

          const answerSpan = document.createElement("span");
          answerSpan.className = "stats-wrong-answer";
          answerSpan.textContent = answerText;

          const metaSpan = document.createElement("span");
          metaSpan.className = "stats-wrong-meta";
          const modeLabel = w.mode === "choice" ? "Multiple Choice" : "Type the Answer";
          const qLabel = w.questionType === "flag" ? "Guess the Flag" : "Guess the Country";
          let metaText = `${statsFormatTimestamp(w.timestamp)} · ${modeLabel} · ${qLabel}`;
          if (w.timeLimitSeconds != null) {
            metaText += ` · ${w.timeTakenSeconds}s / ${w.timeLimitSeconds}s limit`;
          }
          metaSpan.textContent = metaText;

          item.appendChild(answerSpan);
          item.appendChild(metaSpan);
          detail.appendChild(item);
        });

      row.appendChild(detail);
      summary.addEventListener("click", () => {
        detail.hidden = !detail.hidden;
      });
    } else {
      summary.classList.add("no-detail");
    }

    return row;
  }

  function renderStatsSessions() {
    const log = getSessionLog().slice().reverse();
    statsSessionsList.innerHTML = "";

    if (log.length === 0) {
      const empty = document.createElement("p");
      empty.className = "stats-empty";
      empty.textContent = "No sessions played yet.";
      statsSessionsList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    log.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "stats-session-row";

      const header = document.createElement("div");
      header.className = "stats-session-header";

      const date = document.createElement("span");
      date.className = "stats-session-date";
      date.textContent = statsFormatTimestamp(entry.timestamp);

      const rate = statsRate(entry.correct, entry.total);
      const score = document.createElement("span");
      score.className = "stats-rate-badge " + statsRateBadgeClass(rate);
      score.textContent = `${entry.correct}/${entry.total}`;

      header.appendChild(date);
      header.appendChild(score);

      const meta = document.createElement("div");
      meta.className = "stats-session-meta";
      const modeLabel = entry.mode === "choice" ? "Multiple Choice" : "Type the Answer";
      const qLabel = entry.questionType === "flag" ? "Guess the Flag" : "Guess the Country";
      meta.textContent =
        `${entry.stackName} · ${modeLabel} · ${qLabel}` + (entry.completed ? "" : " · Quit early");

      row.appendChild(header);
      row.appendChild(meta);
      fragment.appendChild(row);
    });
    statsSessionsList.appendChild(fragment);
  }
})();
