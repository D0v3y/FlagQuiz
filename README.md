# Flag Quiz

A flag-matching quiz game covering all 195 internationally recognized
sovereign states (193 UN member states + Vatican City + Palestine).

## Running it

No build step and no dependencies. Either:

- Open `index.html` directly in a browser, or
- Serve the folder with any static file server, e.g.:

  ```
  python -m http.server 8000
  ```

  then visit `http://localhost:8000`.

Custom stacks, options, and play stats are all saved to the browser's
`localStorage`, so they persist between visits on the same browser/device.

## Where the data lives

- `data/countries.js` — the single source of truth for all 195 countries:
  ISO 3166-1 alpha-2 code, English common name, and a list of accepted
  aliases (used for forgiving matching in "Type the Answer" mode, e.g.
  "USA" / "United States of America" for the US, "Czech Republic" for
  Czechia, "Ivory Coast" for Côte d'Ivoire).
- `assets/flags/` — one SVG flag per country, named by lowercase ISO
  code (e.g. `us.svg`), sourced from the open-source
  [`flag-icons`](https://github.com/lipis/flag-icons) package.

## Code layout

- `index.html` — markup for every screen (start, game setup, stack
  editor, play, results, wiki, options, stats); screens are shown/hidden
  via a `.active` class.
- `css/style.css` — all styling, mobile-first and responsive.
- `js/utils.js` — small helpers (answer normalization/diacritics
  stripping, shuffling, sampling, flag path lookup).
- `js/storage.js` — all localStorage persistence: custom stacks, app
  options, the session log, and per-country stats.
- `js/game.js` — the `QuizGame` class and quiz logic (scoring, choice
  generation, answer checking), independent of the DOM.
- `js/icons.js` — small inline SVG icons (pencil/save/trash/close).
- `js/app.js` — screen navigation and all DOM/event wiring.

## Stats & session log

Every completed (or early-quit) game is appended to a session log, and
each answered task rolls into that country's cumulative stats: attempts,
correct count, and — for wrong answers only — what was actually picked
(Multiple Choice) or typed (Type the Answer), with a timestamp. The
Stats screen surfaces both: a per-country list sorted worst-success-rate
first (tap a row to see its wrong-answer history), and a reverse-chronological
session list. "Clear stats" on that screen wipes both.

Logging can be turned off entirely from Options ("Enable stats logging");
while off, the Game setup screen shows a "Stats are disabled!" warning and
nothing is recorded. Options also has a per-task time limit (checkbox +
seconds): when it runs out, the task is auto-scored wrong and the game
advances like any other wrong answer. Whenever a time limit was active,
each logged task also records the limit and how many seconds the player
actually took (or that it timed out).

## Notes

- Flags are plain local SVG files, not emoji, so they render
  consistently across platforms (including Windows).
- Text-answer matching is case-insensitive, trims whitespace, strips
  diacritics, and accepts any alias from a country's alias list.
