# EarthRisk — AI Agents & ML Pipeline: Full Guide

> Written for teammates who are new to the project and have never used IBM WatsonX or Milvus.  
> Start here before touching any code in `insurance-risk-agents/` or `ml-model/`.

---

## Table of Contents

1. [What is this system?](#1-what-is-this-system)
2. [Architecture overview](#2-architecture-overview)
3. [Key technologies explained](#3-key-technologies-explained)
4. [The ML model (Flask sidecar)](#4-the-ml-model-flask-sidecar)
5. [Zilliz Cloud (vector database)](#5-zilliz-cloud-vector-database)
6. [IBM WatsonX Orchestrate (AI agents)](#6-ibm-watsonx-orchestrate-ai-agents)
7. [The 4 agents and what they do](#7-the-4-agents-and-what-they-do)
8. [The 5 tools in fetch_tools.py](#8-the-5-tools-in-fetch_toolspy)
9. [Full setup from scratch](#9-full-setup-from-scratch)
10. [Day-to-day workflow](#10-day-to-day-workflow)
11. [Deploying agents in the WatsonX GUI](#11-deploying-agents-in-the-watsonx-gui)
12. [Demo Tests — What to Say to Each Agent](#12-demo-tests--what-to-say-to-each-agent)
13. [Troubleshooting](#13-troubleshooting)
14. [File map](#14-file-map)

---

## 1. What is this system?

EarthRisk is an insurance risk platform for Greek properties. Beyond the web app (React + Express + MySQL), there is an AI layer that lets an insurer ask natural-language questions like:

- *"What is the risk for building BLD_0387?"*
- *"Show me all high-risk buildings in Αττική"*
- *"Should I increase the premium for this property?"*

The AI layer has three components that work together:

```
Parquet data  →  ML model (Flask)  →  Zilliz Cloud (vector DB)
                                              ↓
                              IBM WatsonX agents (chatbot)
```

**No ngrok or local backend is required.** WatsonX agents connect directly to Zilliz Cloud via REST API. The only time you need the local backend is for the `fetch_building_history` tool (year-by-year trends).

---

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  IBM WatsonX Orchestrate (cloud)                            │
│                                                             │
│   User chat  →  Orchestrator  →  picks the right agent     │
│                                       ↓                     │
│              Risk_Explanation_Agent   │  Alerting_Agent     │
│              Data_Interpreter_Agent   │  Decision_Support_Agent │
│                                       ↓                     │
│                              fetch_tools.py (Python tools)  │
│                    (runs in IBM cloud, stdlib only)         │
└───────────────────────────────────────│─────────────────────┘
                                        │  HTTPS REST (port 443)
                                        ↓
                          ┌─────────────────────────┐
                          │  Zilliz Cloud (Milvus)  │
                          │  earthrisk_buildings     │
                          │  earthrisk_kb            │
                          └─────────────────────────┘
                                        ↑
                              ingest_milvus.py (run once)
                                        ↑
                          ┌─────────────────────────┐
                          │  ml-model/app.py (Flask) │
                          │  localhost:5001/predict  │
                          └─────────────────────────┘
                                        ↑
                          historical_insurance_data_lake.parquet
                          (1000 Greek buildings)
```

**Key insight:** WatsonX agents run in IBM's cloud. They call Zilliz Cloud directly over HTTPS using the REST API. No ngrok tunnel, no local backend needed for the main tools.

---

## 3. Key technologies explained

### IBM WatsonX Orchestrate
IBM's platform for building AI agents. Think of it as a chatbot framework where you define agents (personas with instructions and tools) and an orchestrator that decides which agent to call based on the user's message.

- You write agents as YAML files (`agents/*.yaml`)
- You write tools as Python functions with a `@tool` decorator (`src/fetch_tools.py`)
- You import both using the `orchestrate` CLI
- After importing, IBM hosts and runs everything in their cloud

You need: an IBM account, the `ibm-watsonx-orchestrate` Python package, and the `orchestrate` CLI.

### Milvus / Zilliz Cloud
Milvus is a **vector database** — a database designed for similarity search on embeddings (numerical representations of text). Zilliz Cloud is the managed hosted version of Milvus (free tier available).

**Why do we need it?**  
WatsonX agents can't run SQL against our MySQL database or read CSV files. They need a cloud-accessible database. Zilliz is cloud-hosted so agents connect directly without any tunnel.

We use two **collections** (like tables):

| Collection | Contents |
|------------|----------|
| `earthrisk_buildings` | 1000 buildings with all fields + ML predictions |
| `earthrisk_kb` | Knowledge base text chunks for RAG |

### Zilliz REST API
`fetch_tools.py` communicates with Zilliz using only Python's standard library (`urllib`) and the Zilliz REST API (`/v2/vectordb/entities/query`). No heavy packages like `pymilvus` or `sentence_transformers` are used — IBM's cloud execution environment doesn't have them.

### RAG (Retrieval-Augmented Generation)
When an agent needs to answer a policy question ("what is the EarthRisk formula?"), it first calls `query_knowledge_base` which fetches relevant chunks from Zilliz (`earthrisk_kb`), then uses that text as context in its answer.

---

## 4. The ML model (Flask sidecar)

**File:** `ml-model/app.py`  
**Runs on:** `http://localhost:5001`

### Why a Flask server?
The old approach spawned a new Python process for every prediction — slow and wasteful. The Flask sidecar loads all `.pkl` model files **once** at startup and serves predictions via HTTP.

### What models are loaded?

| File | Purpose |
|------|---------|
| `model_fire_classifier.pkl` | Probability of a fire claim |
| `model_fire_regressor.pkl` | Expected fire claim amount (€) |
| `model_flood_classifier.pkl` | Probability of a flood claim |
| `model_flood_regressor.pkl` | Expected flood claim amount (€) |
| `model_earthquake_classifier.pkl` | Probability of an earthquake claim |
| `model_earthquake_regressor.pkl` | Expected earthquake claim amount (€) |
| `model_premium_regressor.pkl` | AI-predicted annual premium (€) |
| `shap_explainer_premium.pkl` | SHAP explainer — which features drive the premium |

### Endpoints

```
GET  /health   → {"status": "ok", "models_loaded": 7}
POST /predict  → send building JSON, receive predictions
```

### What `/predict` returns

```json
{
  "fire_claim_probability": 0.23,
  "fire_expected_claim_eur": 4200.50,
  "flood_claim_probability": 0.07,
  "flood_expected_claim_eur": 1100.00,
  "earthquake_claim_probability": 0.41,
  "earthquake_expected_claim_eur": 8900.00,
  "predicted_premium_eur": 1450.00,
  "shap_top_factors": [
    {"feature": "Seismic Zone", "impact": 0.32, "direction": "increases"},
    {"feature": "Building Age", "impact": 0.18, "direction": "increases"}
  ],
  "enriched_with_live_apis": true
}
```

### Live API enrichment
Before running the models, `app.py` tries to fetch live data for the building's coordinates:
- **Elevation** from Open-Meteo (for flood risk)
- **Climate data** (temperature + rainfall) from Open-Meteo archive
- **Earthquake history** from USGS

If any API fails or is rate-limited, the values from the parquet are used as fallback. Predictions always succeed.

---

## 5. Zilliz Cloud (vector database)

### One-time setup (done by you, once)

1. Create a free account at [cloud.zilliz.com](https://cloud.zilliz.com)
2. Create a Serverless cluster (free tier)
3. Get your **URI** (looks like `https://in03-xxx.serverless.gcp-us-west1.cloud.zilliz.com`) and **API token**
4. Put them in `insurance-risk-agents/.env`:
   ```
   ZILLIZ_URI=https://in03-xxx.serverless.gcp-us-west1.cloud.zilliz.com
   ZILLIZ_TOKEN=your-api-token-here
   ```

### The ingest script

**File:** `ml-model/ingest_milvus.py`

Run this once (or whenever the parquet data or ML models change). It:

1. Loads all 1000 buildings from `historical_insurance_data_lake.parquet`
2. Calls `app.py /predict` for every building (10 in parallel) to get ML predictions
3. Generates natural-language descriptions for each building and converts them to embeddings
4. Inserts everything into the `earthrisk_buildings` Zilliz collection
5. Reads the 4 KB text files, chunks them, embeds them, and inserts into `earthrisk_kb`

**Important:** `app.py` must be running before you run the ingest.

```bash
# Terminal 1
cd ml-model
python app.py

# Terminal 2
cd insurance-risk-agents
.venv\Scripts\python.exe ..\ml-model\ingest_milvus.py
```

Expected output:
```
✓ Ingest complete.
  earthrisk_buildings: 1000 buildings
  earthrisk_kb:        13 KB chunks
```

### Connection note
`fetch_tools.py` communicates with Zilliz over HTTPS port 443 using the REST API — no gRPC, no special port configuration needed.

---

## 6. IBM WatsonX Orchestrate (AI agents)

### What you need

1. An IBM account with WatsonX Orchestrate access (your institution should provide this)
2. The `ibm-watsonx-orchestrate` Python package (already in the venv)
3. Credentials in `insurance-risk-agents/.env`:
   ```
   WO_DEVELOPER_EDITION_SOURCE=orchestrate
   WO_INSTANCE=https://your-instance.ibm.com
   WO_API_KEY=your-api-key
   ```

### How agents work

An **agent** in WatsonX is:
- A YAML file with a name, description, instructions, and a list of tools it can use
- The instructions tell the LLM how to behave and when to call which tool
- The LLM decides when to call a tool, calls it, gets the result, and uses it in its answer

A **tool** in WatsonX is:
- A Python function decorated with `@tool`
- Has a typed signature and a docstring explaining when to use it
- IBM imports it and runs it when the agent decides to call it
- **Must use only standard library imports** — IBM's execution environment does not have packages like `pymilvus`, `sentence_transformers`, `requests`, etc.

### Import workflow

Every time you change `fetch_tools.py` or any agent YAML:

```bash
# 1. Activate the venv
cd insurance-risk-agents
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Mac/Linux

# 2. Log in
orchestrate env activate your-env-name

# 3. Import tools (MUST run from inside src/)
cd src
orchestrate tools import -k python -f fetch_tools.py

# 4. Import agents
cd ..
orchestrate agents import -f agents/risk_explanation_agent.yaml
orchestrate agents import -f agents/alerting_agent.yaml
orchestrate agents import -f agents/data_interpreter_agent.yaml
orchestrate agents import -f agents/decision_support_agent.yaml
```

---

## 7. The 4 agents and what they do

### Risk_Explanation_Agent
**Role:** Calculates and explains the EarthRisk score for a specific building.

**Formula:**
```
Score = Seismic(30%) + Volcanic(10%) + Fire_Access(20%) + Climate(20%) + Age(10%) + Claims(10%)
```
- Score > 65 → High Risk
- Score 35–65 → Medium Risk  
- Score < 35 → Low Risk

**Tools used:** `get_building`, `search_buildings`, `query_knowledge_base`

**Example prompts:**
- "Explain the risk for BLD_0387"
- "What is the most dangerous building in our portfolio?"

---

### Alerting_Agent
**Role:** Generates structured alerts when buildings exceed risk thresholds.

**Tools used:** `get_building`, `fetch_building_history`, `query_knowledge_base`

**Example prompts:**
- "Are there any buildings that need urgent attention?"
- "Generate an alert for BLD_0050"

---

### Data_Interpreter_Agent
**Role:** Translates raw building data into readable summaries and portfolio insights.

**Tools used:** `get_building`, `search_buildings`, `query_knowledge_base`

**Example prompts:**
- "Summarise the data for BLD_0200"
- "What does the portfolio look like in Κρήτη?"

---

### Decision_Support_Agent
**Role:** Recommends premium adjustments and underwriting actions based on ML predictions vs actual premiums.

**Tools used:** `get_building`, `search_buildings`, `get_portfolio_summary`, `query_knowledge_base`

**Example prompts:**
- "Should we reprice BLD_0100?"
- "Which buildings are most underpriced?"

---

## 8. The 5 tools in fetch_tools.py

**File:** `insurance-risk-agents/src/fetch_tools.py`

All tools use Python standard library only (`urllib`, `json`, `os`) and call the **Zilliz REST API** directly. No third-party packages are imported at the top level.

### `get_building`
Fetch the complete record for one building by ID.

```python
get_building(building_id="BLD_0387")
```

Returns all fields: risk score, hazard zones, property details, ML predictions (fire/flood/earthquake probabilities, expected claim amounts, AI premium, SHAP top drivers).

### `search_buildings`
Filter buildings by structured criteria. Results are sorted by risk_score descending.

```python
search_buildings(
    query="old buildings in flood zones",
    prefecture="Αττική",
    risk_min=65,
    flood_zone="high",
    limit=10
)
```

### `query_knowledge_base`
Fetches relevant text chunks from the EarthRisk KB stored in Zilliz. Agents call this first before answering policy questions.

```python
query_knowledge_base(query="how is the seismic zone weight calculated")
query_knowledge_base(query="alerting thresholds", agent_name="alerting")
```

### `get_portfolio_summary`
Computes aggregate stats across all 1000 buildings:
- Total insured value, total premiums
- Average risk score, high-risk count
- Total expected exposure by peril (fire / flood / earthquake)
- Underpriced count (buildings where AI premium > actual by >20%)
- Risk category and zone breakdown

### `fetch_building_history`
Legacy tool — requires the Express backend to be running and `EARTHRISK_BACKEND_URL` set in `.env`. Only used when asked about year-by-year trends. Returns a safe error message if the backend is not configured.

---

## 9. Full setup from scratch

### Prerequisites
- Python 3.10+ with a virtual environment at `insurance-risk-agents/.venv`
- Node.js 18+ for the Express backend
- A Zilliz Cloud free account
- An IBM WatsonX Orchestrate account

### Step 1 — Install Python dependencies
```bash
cd insurance-risk-agents
python -m venv .venv
.venv\Scripts\activate
pip install pymilvus sentence-transformers python-dotenv flask flask-cors \
            joblib numpy pandas scikit-learn requests ibm-watsonx-orchestrate
```

> Note: `pymilvus` and `sentence-transformers` are only needed locally for the ingest script (`ingest_milvus.py`). The `fetch_tools.py` that runs in IBM cloud uses none of them.

### Step 2 — Configure environment variables
Create `insurance-risk-agents/.env`:
```env
# Zilliz Cloud
ZILLIZ_URI=https://in03-xxx.serverless.gcp-us-west1.cloud.zilliz.com
ZILLIZ_TOKEN=your-zilliz-api-token

# IBM WatsonX
WO_DEVELOPER_EDITION_SOURCE=orchestrate
WO_INSTANCE=https://your-instance.ibm.com
WO_API_KEY=your-watsonx-api-key

# Optional (only needed for fetch_building_history)
EARTHRISK_BACKEND_URL=
```

### Step 3 — Run the ingest (one time)
```bash
# Terminal 1: start the ML server
cd ml-model
python app.py

# Terminal 2: run ingest
cd insurance-risk-agents
.venv\Scripts\python.exe ..\ml-model\ingest_milvus.py
```

### Step 4 — Import tools and agents into WatsonX
```bash
cd insurance-risk-agents
.venv\Scripts\activate
orchestrate env activate <your-env>

cd src
orchestrate tools import -k python -f fetch_tools.py

cd ..
orchestrate agents import -f agents/risk_explanation_agent.yaml
orchestrate agents import -f agents/alerting_agent.yaml
orchestrate agents import -f agents/data_interpreter_agent.yaml
orchestrate agents import -f agents/decision_support_agent.yaml
```

### Step 5 — Deploy agents in the WatsonX GUI
After importing, open the WatsonX Orchestrate web UI:
1. Go to **AI agents** in the left sidebar
2. Click on each agent
3. Hit the **Deploy** button (top right)
4. Wait for status to change from *Draft* to *Live*

See [section 11](#11-deploying-agents-in-the-watsonx-gui) for a full explanation of what Deploy does.

### Step 6 — Test in WatsonX chat UI
Open the WatsonX Orchestrate chat and try:
- "What is the risk for building BLD_0001?"
- "Show me high risk buildings in Αττική"
- "Give me a portfolio summary"

---

## 10. Day-to-day workflow

### When do I need to re-run the ingest?
- If the parquet data changes (new buildings added, values updated)
- If the ML models (`.pkl` files) are retrained

### When do I need to re-import tools?
- Any time you edit `fetch_tools.py`
- After re-importing tools you must also re-import and re-deploy all agents (IBM links tools to agents by name)

### When do I need to re-import agents?
- Any time you edit any file in `insurance-risk-agents/agents/`
- After every tool re-import

### The ML server (app.py) — when does it need to run?
- During the ingest (step 3 above)
- When the Express backend needs predictions via `GET /api/ml-buildings/:id/predict`
- **Not needed** for WatsonX agents (they query Zilliz, not the Flask server)

---

## 11. Deploying agents in the WatsonX GUI

### What the Deploy button does

When you import an agent via `orchestrate agents import`, the agent enters **Draft** state — it exists in WatsonX but is not yet active in the chat interface. Pressing **Deploy** does the following:

1. **Validates** the agent's YAML, tools list, and instructions for errors
2. **Publishes** the agent so it appears in the WatsonX chat UI and is selectable by the orchestrator
3. **Links** the agent to the specific version of the tools that were imported most recently
4. Changes the agent status from *Draft* → *Live*

### Should you always press Deploy after importing?

**Yes.** The import step uploads the definition; the deploy step activates it. Until deployed, changes to tools or instructions are not visible in the chat.

### Re-deploy after every re-import

If you re-import tools or re-import an agent YAML, you must re-deploy that agent in the GUI for the changes to take effect. The chat will keep running the previous deployed version until you deploy again.

### Deploy order does not matter

You can deploy agents in any order. The orchestrator picks the right agent at chat time based on the user's message, not deployment order.

---

## 12. Demo Tests — What to Say to Each Agent

Use these prompts in the WatsonX Orchestrate chat to verify that each agent is working correctly. Each prompt is designed to exercise a specific tool or capability. Expected behavior is noted so you know what a correct response looks like.

---

### Risk_Explanation_Agent

**Goal:** Verify it fetches a building, calculates the EarthRisk score using the formula, and explains each factor.

| # | What to type | What it should do | Tool(s) called |
|---|---|---|---|
| 1 | `Explain the risk for building BLD_0050` | Fetch building data, calculate score from formula, explain each factor (seismic, climate, age, etc.) | `query_knowledge_base` → `get_building` |
| 2 | `What is the most dangerous building in the portfolio?` | Search all buildings sorted by risk descending, present the top one with explanation | `query_knowledge_base` → `search_buildings(risk_min=0)` |
| 3 | `Show me the top 5 highest risk buildings` | Return 5 buildings sorted by risk_score descending with brief explanations | `search_buildings(limit=5)` |
| 4 | `What is the EarthRisk formula and how is the seismic weight calculated?` | Answer from KB without fetching any building | `query_knowledge_base` |
| 5 | `Find high risk buildings in Αττική` | Filter by prefecture=Αττική + risk_min=65, explain why they are high risk | `search_buildings(prefecture="Αττική", risk_min=65)` |
| 6 | `Is BLD_0001 at risk from earthquakes?` | Fetch building, highlight earthquake_zone and seismic contribution to score | `get_building` |

**Signs of a healthy response:**
- Mentions the formula: `Seismic(30%) + Volcanic(10%) + Fire_Access(20%) + Climate(20%) + Age(10%) + Claims(10%)`
- States a numeric score (e.g. 72.4) and a risk category (High / Medium / Low)
- Response is in Greek
- If score > 65, recommends consulting the Alerting Agent

---

### Alerting_Agent

**Goal:** Verify it generates structured alerts with urgency level and trend analysis.

| # | What to type | What it should do | Tool(s) called |
|---|---|---|---|
| 1 | `Generate an alert for BLD_0050` | Fetch building, classify urgency (CRITICAL/HIGH/MEDIUM), list recommended actions | `query_knowledge_base` → `get_building` |
| 2 | `Is there anything that needs urgent attention in the portfolio?` | Search for buildings with risk > 65 and generate alert for the worst one | `query_knowledge_base` → `get_building` |
| 3 | `What urgency level is BLD_0387?` | Fetch building, map risk_score to urgency classification | `get_building` |
| 4 | `What are the escalation procedures for a CRITICAL alert?` | Answer from KB only — no building fetch needed | `query_knowledge_base` |
| 5 | `Show the historical trend for BLD_0050` | Attempt to call fetch_building_history — if backend not set, should return a clear message about it | `get_building` → `fetch_building_history` |

**Signs of a healthy response:**
- Response starts with urgency level in bold: **CRITICAL**, **HIGH**, or **MEDIUM**
- Includes recommended actions as a bullet list
- Response is in Greek
- If `fetch_building_history` has no backend configured, it says so clearly instead of crashing

---

### Data_Interpreter_Agent

**Goal:** Verify it describes raw building data clearly without making recommendations.

| # | What to type | What it should do | Tool(s) called |
|---|---|---|---|
| 1 | `Summarise the data for BLD_0200` | Fetch and display all fields in a readable format | `query_knowledge_base` → `get_building` |
| 2 | `What does the portfolio look like in Κρήτη?` | Search buildings filtered by prefecture=Κρήτη, describe distribution of risk scores and zones | `search_buildings(prefecture="Κρήτη")` |
| 3 | `Describe the buildings in high flood zones` | Filter by flood_zone=high, list and describe them | `search_buildings(flood_zone="high")` |
| 4 | `What is the construction material of BLD_0100 and how old is it?` | Fetch building, report construction_material and year_built | `get_building` |
| 5 | `Show me buildings near nature in high earthquake zones` | Filter by earthquake_zone=high, highlight near_nature field | `search_buildings(earthquake_zone="high")` |
| 6 | `What does the fire_risk field mean?` | Answer from KB without fetching any building | `query_knowledge_base` |
| 7 | `Tell me about the 10 riskiest buildings in Μακεδονία` | Search by prefecture + sort by risk, describe each building's key stats | `search_buildings(prefecture="Μακεδονία", limit=10)` |

**Signs of a healthy response:**
- Lists all relevant fields (risk_score, zones, material, year_built, ML predictions, premium)
- Does NOT make any recommendations (those belong to Decision_Support_Agent)
- Response is in Greek with clear bullet-point formatting

---

### Decision_Support_Agent

**Goal:** Verify it gives ranked, numbered premium and coverage suggestions backed by portfolio context.

| # | What to type | What it should do | Tool(s) called |
|---|---|---|---|
| 1 | `Should we reprice BLD_0100?` | Fetch building, compare annual_premium_euro vs predicted_premium_eur, give ranked suggestions | `query_knowledge_base` → `get_building` |
| 2 | `Which buildings are the most underpriced?` | Search buildings, sort by premium_gap_eur descending, recommend repricing | `search_buildings` |
| 3 | `Give me a full portfolio health overview` | Call get_portfolio_summary, interpret totals and risk distribution | `query_knowledge_base` → `get_portfolio_summary` |
| 4 | `How does BLD_0050 compare to the portfolio average?` | Fetch building + portfolio summary, compare risk_score and premium_gap to averages | `get_building` → `get_portfolio_summary` |
| 5 | `What actions should we take for high-risk buildings in Αττική?` | Search by prefecture + risk_min=65, suggest actions for each | `search_buildings(prefecture="Αττική", risk_min=65)` |
| 6 | `What premium adjustment guidelines apply to concrete buildings in seismic zone 3?` | Answer from KB only | `query_knowledge_base` |
| 7 | `Find all buildings where the AI predicts a much higher premium than what we charge` | Search all buildings, filter by large premium_gap_eur | `search_buildings` |

**Signs of a healthy response:**
- Suggestions are **numbered by priority** (1 = most urgent)
- Each suggestion has: action, confidence level, reason
- Response ends with a disclaimer that these are suggestions only
- Response is in Greek

---

### Full end-to-end test sequence (copy-paste these in order)

Run these one after another in the chat to exercise all 4 agents and the orchestrator's routing logic:

```
1.  Explain the risk for BLD_0387
2.  Generate an alert for BLD_0387
3.  Summarise all the data for BLD_0387
4.  Should we reprice BLD_0387?
5.  What are the top 3 most dangerous buildings in the portfolio?
6.  Give me a full portfolio summary
7.  Find underpriced buildings in Αττική
8.  What is the EarthRisk formula?
9.  What escalation steps apply when a building scores above 80?
10. Which buildings have a high flood zone AND high earthquake zone?
```

Each prompt should be routed to the correct agent by the orchestrator automatically. If any prompt goes to the wrong agent or returns a tool error, re-import tools and re-deploy the affected agent.

---

## 13. Troubleshooting

### `ModuleNotFoundError: No module named 'sentence_transformers'` (or `pymilvus`)
`fetch_tools.py` must use **only Python standard library** — IBM's cloud runtime does not have third-party packages. The current version of `fetch_tools.py` uses only `urllib`, `json`, and `os`. If you see this error, make sure you are importing the latest version of the file (re-run `orchestrate tools import`).

### "Connecting to Zilliz..." hangs / timeout
Check that `ZILLIZ_URI` in `.env` is the correct Serverless endpoint and does not include a port number. The REST API uses port 443 automatically.

### `Error fetching building: unknown url type: 'PASTE_NGROK_URL_HERE/...'`
An old version of the tools (the ngrok-based version) is still active in WatsonX. Re-import tools and re-deploy all agents.

### `Building BLD_XXXX not found`
The building ID might be lower-case. `get_building` automatically uppercases the ID. Check that the ingest completed successfully (`earthrisk_buildings` collection should have 1000 entries in the Zilliz UI).

### `No module named 'dotenv'` or similar (local)
You're using the wrong Python. Always use the venv Python:
```bash
# Windows
insurance-risk-agents\.venv\Scripts\python.exe script.py
```

### `app.py is not running` during ingest
Start `ml-model/app.py` in a separate terminal first.

### Climate API errors during ingest
Open-Meteo rate-limits batch requests. The code falls back to parquet values automatically — these warnings are cosmetic and predictions are unaffected.

### Agent gives wrong answer / ignores tools
1. Check that the tool import succeeded (no errors in `orchestrate tools import`)
2. Check that the agent YAML lists the correct tool names under `tools:`
3. Re-import the agent and re-deploy

---

## 14. File map

```
Dualboots-1/
│
├── ml-model/
│   ├── app.py                          ← Flask ML server (start this first for ingest)
│   ├── ingest_milvus.py                ← One-time ingest script
│   ├── read_buildings.py               ← Reads parquet → JSON array
│   ├── external_apis.py                ← Live elevation/climate/earthquake APIs
│   ├── historical_insurance_data_lake.parquet  ← Raw data (1000 buildings)
│   ├── model_fire_classifier.pkl       ┐
│   ├── model_fire_regressor.pkl        │
│   ├── model_flood_classifier.pkl      │
│   ├── model_flood_regressor.pkl       ├── Trained ML models
│   ├── model_earthquake_classifier.pkl │
│   ├── model_earthquake_regressor.pkl  │
│   ├── model_premium_regressor.pkl     │
│   ├── shap_explainer_premium.pkl      │
│   ├── web_app_scaler.pkl              │
│   ├── web_app_features_final.pkl      │
│   └── web_app_geozone_mapper.pkl      ┘
│
├── insurance-risk-agents/
│   ├── .env                            ← Credentials (DO NOT COMMIT)
│   ├── .venv/                          ← Python virtual environment
│   ├── src/
│   │   └── fetch_tools.py              ← All 5 WatsonX tools
│   │                                     (stdlib only — no pymilvus/sentence_transformers)
│   ├── agents/
│   │   ├── risk_explanation_agent.yaml ← tools: get_building, search_buildings, query_knowledge_base
│   │   ├── alerting_agent.yaml         ← tools: get_building, fetch_building_history, query_knowledge_base
│   │   ├── data_interpreter_agent.yaml ← tools: get_building, search_buildings, query_knowledge_base
│   │   └── decision_support_agent.yaml ← tools: get_building, search_buildings, get_portfolio_summary, query_knowledge_base
│   └── knowledge-bases/
│       ├── kb_risk_explanation.txt     ← Policy text ingested into Zilliz earthrisk_kb
│       ├── kb_alerting.txt
│       ├── kb_data_interpreter.txt
│       └── kb_decision_support.txt
│
├── back-end/server/
│   └── routes/
│       └── mlBuildingsRoutes.js        ← Express routes that call app.py via axios
│
├── front-end/client/                   ← React app (Mapbox map, charts, building cards)
│
└── documentation/
    └── AI_AGENTS_GUIDE.md              ← This file
```
