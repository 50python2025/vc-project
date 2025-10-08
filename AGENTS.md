# Repository Guidelines

## Project Structure & Module Organization
This monorepo bundles several standalone browser projects (`tetris/`, `pomodoro/`, `image-compressor/`, `number-guess/`, `amidakuji/`, and `gomoku-web/`) alongside the root landing page `index.html` and the console game `gomokunarabe.py`. Each web app folder follows the same layout (`index.html`, `app.js`, `style.css`); keep that trio intact when adding features or creating new modules so the root page stays in sync. When you borrow UI components, start from the most recent project and adapt the styling instead of editing older apps in place.

## Build, Test, and Development Commands
All projects are static and run in a browser. During development launch a local server from the repo root with `python -m http.server 5173`, then open http://localhost:5173 in your browser. PowerShell users can open the URL automatically with `pwsh -c "Start-Process http://localhost:5173"`. For quick linting of JavaScript edits, run `npx eslint app.js` inside the project folder if ESLint is installed. The Python game runs with `python gomokunarabe.py`.

## Coding Style & Naming Conventions
JavaScript sources use four-space indentation, single quotes for strings, arrow functions for callbacks, and explicit semicolons; match that format. Favor descriptive camelCase for variables, PascalCase for constructor-style helpers, and hyphen-case class names in CSS (see `tetris/style.css`). Keep functions tight by extracting helpers once logic grows beyond a few branches. If you rely on a formatter, configure Prettier with `--single-quote --tab-width 4` to avoid churn.

## Testing Guidelines
There are no automated tests yet, so smoke-test each feature manually on Chromium and Firefox by navigating through `index.html` and directly opening the project subfolder. Validate keyboard controls, resize behavior, and any score or state persistence before marking work complete. For JavaScript utilities, add lightweight assertion snippets guarded by a debug flag so they can be disabled in production builds. Capture regressions in the pull request description together with replication steps.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`) as seen in recent history. Limit summaries to 72 characters and keep the body wrapped at 100 characters. Each pull request should include a concise summary, screenshots or GIFs for UI changes, links to related issues, manual test notes, and a checklist of impacted projects. Request review from a maintainer familiar with the specific mini app before merging.

## Adding a New Project Module
Clone an existing folder as a starting point, update titles and metadata, then register the project in the root `index.html` card list. Keep assets under a local `assets/` directory within your module to avoid cross-project coupling. Confirm the module loads without build tooling so GitHub Pages can serve it as plain static files.
