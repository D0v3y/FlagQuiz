Build a web-based flag quiz game where the player matches flags to countries. It must work well on both mobile and desktop (responsive layout, touch-friendly tap targets, no hover-only interactions).

## Tech & data
- Use plain HTML, CSS, and JavaScript (no framework required unless you think one is clearly justified). The app should run by opening index.html or via a simple static server.
- Country data: all 195 internationally recognized sovereign states (193 UN member states + Vatican City + Palestine). Store them in a single data file (e.g. countries.js / countries.json) with: ISO 3166-1 alpha-2 code, English common name, and a list of accepted alternative names/aliases (e.g. "USA", "United States of America", "UK", "Czechia"/"Czech Republic", "Côte d'Ivoire"/"Ivory Coast").
- Flags: use SVG flags stored locally in the project (e.g. from the open-source `flag-icons` package or similar), referenced by ISO code. Don't rely on emoji flags, since they don't render on Windows.
- Persist custom stacks in localStorage.

## Terminology
- Task: a single flag question (one country).
- Stack: a named set of tasks.

## Start page
- Three buttons, centered horizontally and vertically, stacked vertically on top of each other: "Game", "Wiki", "Options".

## Game
### Step 1: Stack selection
- A dropdown lists all available stacks. The default stack "All countries (195)" is always present and selected by default. Custom stacks appear below it.
- Next to the dropdown is a pencil icon button that opens the custom stack editor:
  - If the default stack is selected, the editor opens in "create" mode: no tasks preselected and an empty name field.
  - If a custom stack is selected, the editor opens in "edit" mode: that stack's tasks are preselected and its name is prefilled.
- The default "All countries" stack cannot be edited or deleted.

### Custom stack editor
- Shows a scrollable list of all 195 tasks (small flag + country name + checkbox). The user can select/deselect tasks.
- Include "Select all" and "Deselect all" controls at the top of the list.
- Fixed to the bottom of the screen (not scrolling with the list): a text input for the stack name with a save icon button next to it.
- The save button is disabled (visibly greyed out and not clickable) until the name field contains non-whitespace text. It should also be disabled if zero tasks are selected.
- Stack names must be unique. If the name is already used by another stack, keep save disabled and show a short inline message.
- Clicking save stores the stack in localStorage, closes the editor, and selects the stack in the dropdown. In edit mode, save updates the existing stack instead of creating a new one.
- In edit mode only, show a delete (trash) icon. Clicking it asks for confirmation. On confirm, the stack is removed from localStorage and the dropdown, and the dropdown falls back to "All countries".
- Provide a way to close the editor without saving (back/close button).

### Step 2: Mode selection
After a stack is selected, the player chooses one of two modes, then starts the game. Tasks within a stack are presented in random order.

**Mode 1: Multiple choice**
- Flag displayed at the top center.
- Below it, four answer tiles with country names: one correct, three random wrong answers drawn from all 195 countries (no duplicates), in random positions.
- Clicking a tile records the answer as correct/wrong and advances to the next task.

**Mode 2: Type the answer**
- Flag displayed at the top center.
- Below it, a text input and an "Enter" button. Pressing the Enter key or the button submits the answer and advances to the next task.
- Answer matching must be forgiving: case-insensitive, ignore leading/trailing whitespace, ignore diacritics/accents, and accept any alias from the country's alias list.
- Auto-focus the input on each new task.

**Both modes**
- Show progress (e.g. "12 / 195") during the game.
- After each answer, show brief feedback before advancing:
  - Correct: a green "Correct!" indication.
  - Wrong: a red "Wrong, it was [Country Name]" indication. In Mode 1, also highlight the correct tile in green and the chosen tile in red.
- The feedback stays visible for about 1.5 seconds, then the game automatically advances to the next task. Tapping/clicking anywhere (or pressing Enter) during the feedback skips ahead immediately.
- Disable answer input while feedback is showing so answers can't be submitted twice.
- Provide a way to quit back to the start page.

### End of stack
- Show a results screen: number correct, number wrong, and a list of the failed tasks (flag + correct country name).
- If there were any failed tasks, show a "Retry failed" button that starts a new round (same mode) containing only the failed tasks. This can repeat until nothing is failed.
- Also offer "Back to start".

## Wiki
- A scrollable, responsive grid showing all 195 flags, each with its country name below it, sorted alphabetically.
- Adjust the number of columns to screen width (fewer on mobile, more on desktop).
- Provide a back button to the start page.

## Options
- Stub only: a page with the title "Options", a "Coming soon" placeholder, and a back button.

## General requirements
- Clean, simple visual design; flags should display with correct aspect ratio and a subtle border so white flags are visible.
- Keep the code modular and readable (separate files for data, game logic, and UI where sensible).
- Include a short README explaining how to run the project and where the country/alias data lives.