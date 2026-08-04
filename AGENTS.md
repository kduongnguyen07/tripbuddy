# Repository Guidelines

## Project Structure & Module Organization

TripBuddy is a React/Vite frontend with a FastAPI backend. Frontend code lives in `src/`: reusable UI is grouped by domain in `components/` (`admin/`, `itinerary/`, `destination/`, and `sections/`), while `services/`, `types/`, `context/`, and `data/` hold API access, shared types, state, and static data. The Python API and planning logic are in `backend/`; keep routes in `main.py`, schemas in `schemas.py`, persistence in `database.py`/`models.py`, and planning logic in `planner.py`. `api/index.py` is the Vercel entry point. Python tests belong in `tests/` as `test_*.py`.

## Build, Test, and Development Commands

- `npm install` installs frontend dependencies.
- `npm run dev` starts the Vite development server.
- `npm run build` type-checks TypeScript and produces the production frontend build.
- `python -m venv .venv` creates the recommended Python environment.
- `.venv\Scripts\python.exe -m pip install -r requirements.txt` installs backend and test dependencies on Windows.
- `.venv\Scripts\python.exe -m uvicorn backend.main:app --reload` runs the API locally; browse `/docs` for Swagger UI.
- `.venv\Scripts\python.exe -m pytest` runs the Python test suite.

## Coding Style & Naming Conventions

Follow the conventions of nearby files. Use two-space indentation, single quotes, and semicolons in TypeScript/TSX. Components and exported TypeScript types use `PascalCase`; hooks, variables, and functions use `camelCase`; component files use `PascalCase.tsx`. Python uses four-space indentation, `snake_case` names, type hints where practical, and focused functions. No formatter or linter is configured, so run `npm run build` and keep changes stylistically consistent before submitting.

## Testing Guidelines

Use `pytest` for backend behavior. Name files `test_<feature>.py` and tests `test_<expected_behavior>()`; cover both valid and missing/invalid inputs where relevant. Add or update tests alongside changes to routing, planning, data normalization, or distance calculations. Frontend has no automated test runner configured; verify UI changes with `npm run dev` and a clean `npm run build`.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit-style subjects, such as `feat: update plan creator`, `fix: constrain hotel recommendations`, and `docs: add readme`. Use `feat:`, `fix:`, `docs:`, or `security:` followed by an imperative summary. Keep commits scoped. Pull requests should explain the user-visible or API impact, link related issues when available, include screenshots for visual changes, and state the commands/tests run. Never commit `.env` values, database backups, or API keys; keep secrets backend-only.
