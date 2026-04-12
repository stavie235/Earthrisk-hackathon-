# EarthRisk — CLAUDE.md
_Auto-generated on 2026-03-28_

## Project Overview
**EarthRisk** is an insurance risk prediction platform (previously called Amperio). It helps insurers assess geographic and climate-based risk for buildings using map visualizations and AI agents.

## Repo Structure

```
Dualboots-1/
├── front-end/client/        # React 19 + Vite SPA
├── back-end/server/         # Node.js / Express API (CommonJS)
├── insurance-risk-agents/   # Python AI agents (IBM WatsonX Orchestrate)
│   ├── src/                 # alert_check.py, explain_risk.py, interpret_data.py, suggest_actions.py, fetch_tools.py
│   ├── agents/              # risk_explanation_agent.yaml, alerting_agent.yaml, data_interpreter_agent.yaml, decision_support_agent.yaml
│   ├── knowledge-bases/     # kb_risk_explanation.txt, kb_alerting.txt, kb_data_interpreter.txt, kb_decision_support.txt
│   └── .env                 # WatsonX credentials (DO NOT COMMIT real keys)
├── ml-model/                # earthrisk_knowledge_base.txt, export_knowledge_base.py, preprocess.py
├── data-analysis/           # Dataset.csv, Insurance_Ready_For_ML.csv, data scripts
├── documentation/
└── ai-log/
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, React Router v7, Mapbox GL, Leaflet + heatmap, Recharts, Axios |
| Backend | Express 5, MySQL2, JWT auth, bcrypt, multer, nodemon |
| AI Agents | Python, IBM WatsonX Orchestrate (`ibm-watsonx-orchestrate`), pymysql |
| Testing | Jest + Supertest (backend) |

## Running Locally

### Backend
```bash
cd back-end/server
npm install
# copy example.env → .env and fill in DB + JWT secrets
npm start        # nodemon on port 9876
npm test         # jest -i
```

### Frontend
```bash
cd front-end/client
npm install
npm run dev      # Vite dev server
```

### AI Agents — Local Dev (requires ngrok)
The fetch_tools.py calls the Express backend via HTTP. Since WatsonX tools run in IBM cloud,
the local backend must be exposed via ngrok for agents to reach it.

```bash
# Terminal 1 — start backend
cd back-end/server && npm start

# Terminal 2 — expose backend to internet
ngrok http 9876
# Copy the https://xxxx.ngrok-free.app URL

# Update BACKEND_URL in insurance-risk-agents/src/fetch_tools.py with the ngrok URL

# Terminal 3 — import tools and agents
cd insurance-risk-agents/src
orchestrate tools import -k python -f fetch_tools.py
cd ..
orchestrate agents import -f agents/risk_explanation_agent.yaml
orchestrate agents import -f agents/alerting_agent.yaml
orchestrate agents import -f agents/data_interpreter_agent.yaml
orchestrate agents import -f agents/decision_support_agent.yaml
```

**Note:** Always run `orchestrate tools import` from inside `src/` — not from `insurance-risk-agents/`.
The module name is derived from filename so Python path must include the file's directory.

## Backend API Routes

| Mount | File |
|-------|------|
| `/api/users` | userRoutes.js |
| `/api/auth` | authRoutes.js |
| `/api/admin` | adminRoutes.js |
| `/api/buildings` | buildingRoutes.js |
| `/api/adminStats` | adminStatsRoutes.js |

Default port: **9876** (override with `PORT` env var).
HTTPS is opt-in via `USE_HTTPS=true` + `server.key` / `server.cert`.

### Building Endpoints (buildingRoutes.js)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/buildings` | All buildings (ORDER BY risk_score DESC) |
| GET | `/api/buildings?risk_min=X&...` | Filtered search (risk_min, risk_max, building_type, flood_zone, earthquake_zone, risk_category, postal_code, q) |
| GET | `/api/buildings/search` | Explicit search endpoint |
| GET | `/api/buildings/external/:externalId` | Fetch by BLD_XXXX external ID |
| GET | `/api/buildings/:id/history` | Year-by-year BuildingHistory for a building |
| GET | `/api/buildings/:id` | Fetch by numeric DB id |

**Route order matters:** `/external/:externalId` and `/:id/history` must be registered BEFORE `/:id`.

### AdminStats Endpoints (adminStatsRoutes.js)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/adminStats/charts` | verifyToken + verifyAdmin | Full chart data |
| GET | `/api/adminStats/buildingHistory` | verifyToken + verifyAdmin | All building history |
| GET | `/api/adminStats/portfolio` | None | Unauthenticated portfolio stats for AI agents |

## AI Agents Architecture

### 4 WatsonX Orchestrate Agents

| Agent | ID | Role |
|-------|-----|------|
| Risk_Explanation_Agent | aacdc499-... | Calculates EarthRisk score, explains factors |
| Alerting_Agent | fed05384-... | Generates alerts when score > 65 |
| Data_Interpreter_Agent | 4e2d2846-... | Interprets building data into readable summaries |
| Decision_Support_Agent | 37f6d571-... | Suggests premium adjustments and actions |

### fetch_tools.py — Shared HTTP Tools

All agents share these 4 tools (defined in `insurance-risk-agents/src/fetch_tools.py`).
They call the Express backend via HTTP. `BACKEND_URL` defaults to ngrok URL (hardcoded for dev).

| Tool | Endpoint | Description |
|------|----------|-------------|
| `fetch_building_by_id(building_id)` | GET `/api/buildings/external/:id` | Fetch building by BLD_XXXX |
| `fetch_buildings_by_risk(risk_min, prefecture)` | GET `/api/buildings?risk_min=X` | Portfolio queries, sorted by risk DESC |
| `fetch_building_history(building_id)` | GET `/api/buildings/:id/history` | Year-by-year risk history |
| `fetch_portfolio_stats()` | GET `/api/adminStats/portfolio` | Aggregate portfolio stats |

### Tools per Agent

| Agent | Tools |
|-------|-------|
| Risk_Explanation_Agent | fetch_building_by_id, fetch_buildings_by_risk, calculate_and_explain_risk |
| Alerting_Agent | fetch_building_by_id, fetch_building_history, generate_risk_alert |
| Data_Interpreter_Agent | fetch_building_by_id, fetch_buildings_by_risk, interpret_building_data |
| Decision_Support_Agent | fetch_building_by_id, fetch_buildings_by_risk, fetch_portfolio_stats, suggest_insurance_actions |

### Knowledge Bases (per agent — 1 file each)

Each agent has its own specialized KB file. Upload to WatsonX KB UI per agent.

| Agent | KB File |
|-------|---------|
| Risk_Explanation_Agent | `insurance-risk-agents/knowledge-bases/kb_risk_explanation.txt` |
| Alerting_Agent | `insurance-risk-agents/knowledge-bases/kb_alerting.txt` |
| Data_Interpreter_Agent | `insurance-risk-agents/knowledge-bases/kb_data_interpreter.txt` |
| Decision_Support_Agent | `insurance-risk-agents/knowledge-bases/kb_decision_support.txt` |

All agents are instructed to **consult their KB first** before answering.

### EarthRisk Formula (for reference)
```
Score = Seismic(30%) + Volcanic(10%) + Fire_Access(20%) + Climate(20%) + Age(10%) + Claims(10%)
Score > 65 → High Risk | Score 35–65 → Medium Risk | Score < 35 → Low Risk
```

## Key Env Variables

### Backend (`back-end/server/.env`)
- `PORT` — server port (default 9876)
- `USE_HTTPS` — `true` / `false`
- `DB_*` — MySQL connection details
- `JWT_SECRET` — token signing secret

### AI Agents (`insurance-risk-agents/.env`)
- `WO_DEVELOPER_EDITION_SOURCE=orchestrate`
- `WO_INSTANCE` — WatsonX instance URL
- `WO_API_KEY` — WatsonX API key
- `EARTHRISK_BACKEND_URL` — ngrok or deployed backend URL (also hardcoded in fetch_tools.py for dev)

## Important Notes
- Never commit real API keys or DB credentials.
- Backend uses CommonJS (`"type": "commonjs"`); frontend uses ESM (`"type": "module"`).
- Map features use both Mapbox GL and Leaflet — Mapbox handles the base map + risk heatmap overlay, Leaflet handles additional layers.
- WatsonX Python tools execute in IBM cloud — local backend is NOT reachable without ngrok or deployment.
- `enrichWithBuildingData()` in `agentController.js` is legacy — still active but should be removed once fetch_tools are fully working (agents fetch their own data).
- The `Insurance_Ready_For_ML.csv` in data-analysis/ is normalized ML training data (0–1 floats) — useless for KB. Use `ml-model/earthrisk_knowledge_base.txt` or the per-agent KB files instead.
