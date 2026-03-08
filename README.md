# WFMToolkit

Vue 3 + Vite frontend with a FastAPI backend that runs Erlang C/Erlang A staffing calculations.

## Requirements

- Node.js 20+
- npm 10+
- Python 3.11+

## Run locally

1. Install frontend dependencies:

```bash
npm install
```

2. Create and activate a Python virtual environment, then install backend dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

3. Start the FastAPI server:

```bash
uvicorn backend.app.main:app --reload
```

4. In a second terminal, start the Vue dev server:

```bash
npm run dev
```

5. Open the local URL shown in your terminal (typically `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

## Current scope

- Frontend (Vue 3) + backend API (FastAPI)
- Single homepage
- Header, hero, Erlang C input form, and footer
- Form posts input values to the calculation API endpoint
- API returns calculated staffing summary and scenario rows
- No database or authentication
