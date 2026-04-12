# EarthRisk — Master Setup Guide
### How to run everything from scratch, on any machine, any day.

---

## THE GOLDEN RULE — Which terminal for what

| What you want to do | Where you open the terminal | What you activate |
|---|---|---|
| Upload/manage AI agents on IBM | `C:\Users\stavie\Dualboots-1\insurance-risk-agents` | `.venv` (Python virtual env) |
| Run the backend server | `C:\Users\stavie\Dualboots-1\back-end\server` | Nothing (just Node) |
| Run the frontend | `C:\Users\stavie\Dualboots-1\front-end\client` | Nothing (just Node) |
| IBM Cloud account management | Anywhere | IBM Cloud CLI (`ibmcloud login`) |

---

## PART 1 — The Virtual Environment (.venv)

### What is it?
The `.venv` folder is a mini Python bubble that lives inside the `insurance-risk-agents` folder.
It has the `orchestrate` command installed inside it. Outside of this bubble, `orchestrate` doesn't exist.

### When do you NEED the .venv active?
Only when you are doing something with **IBM WatsonX Orchestrate agents** via the CLI:
- Importing/updating tools (`orchestrate tools import ...`)
- Importing/updating agents (`orchestrate agents import ...`)
- Listing what's on IBM (`orchestrate tools list`, `orchestrate agents list`)
- Connecting to IBM for the first time (`orchestrate env add ...`)

### When do you NOT need it?
- Running the backend (Node.js)
- Running the frontend (Vite/React)
- Editing code files
- The web app itself calls IBM via the backend — no venv needed for that

### How to activate it (every time you open a new PowerShell)

**Step 1 — Open PowerShell**

**Step 2 — Go to the right folder:**
```powershell
cd C:\Users\stavie\Dualboots-1\insurance-risk-agents
```

**Step 3 — Activate:**
```powershell
.venv\Scripts\activate
```

**Step 4 — You should see `(.venv)` at the start of the line:**
```
(.venv) PS C:\Users\stavie\Dualboots-1\insurance-risk-agents>
```

If you don't see `(.venv)` — STOP. Do not run any `orchestrate` commands.

### How to deactivate (when you're done)
```powershell
deactivate
```

---

## PART 2 — Complete System Setup From Scratch

Do this if you're on a new computer, or if something is completely broken.

---

### STEP 1 — Prerequisites (install once, ever)

- **Node.js** (v18 or newer): https://nodejs.org
- **Python 3.11 or 3.12**: https://python.org
- **MySQL**: for the database
- **Git**: to clone the repo

---

### STEP 2 — Clone the repo

```powershell
git clone https://github.com/stavie235/Dualboots Dualboots-1
cd Dualboots-1
```

---

### STEP 3 — Set up the Backend

**You are in:** `C:\Users\stavie\Dualboots-1\back-end\server`

```powershell
cd C:\Users\stavie\Dualboots-1\back-end\server
npm install
```

Create the `.env` file (copy from `example.env` and fill in real values):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=earthrisk
DB_TEST_NAME=earthrisk_test
JWT_SECRET=any_long_random_string_here
USE_HTTPS=false
PORT=9876
WO_INSTANCE=https://api.eu-central-1.dl.watson-orchestrate.ibm.com/instances/YOUR_INSTANCE_ID
WO_API_KEY=your_mcsp_key_from_watsonx_orchestrate_ui
```

Start the backend:
```powershell
npm start
```
You should see: `HTTP server running at http://localhost:9876`

---

### STEP 4 — Set up the Frontend

**You are in:** `C:\Users\stavie\Dualboots-1\front-end\client`

```powershell
cd C:\Users\stavie\Dualboots-1\front-end\client
npm install
npm run dev
```
You should see: `Local: http://localhost:5173`

---

### STEP 5 — Set up the AI Agents (.venv + IBM connection)

**You are in:** `C:\Users\stavie\Dualboots-1\insurance-risk-agents`

```powershell
cd C:\Users\stavie\Dualboots-1\insurance-risk-agents
```

Create the Python virtual environment (only once):
```powershell
python -m venv .venv
```

Activate it:
```powershell
.venv\Scripts\activate
```

Install the orchestrate CLI (only once):
```powershell
pip install ibm-watsonx-orchestrate
```

Connect to IBM (only once per machine, or after re-creating the venv):
```powershell
orchestrate env add -n hackathon -u https://api.eu-central-1.dl.watson-orchestrate.ibm.com/instances/YOUR_INSTANCE_ID --type mcsp --activate
```
When asked for API key → paste your MCSP key from WatsonX Orchestrate UI.

---

### STEP 6 — Upload tools and agents to IBM

**You are in:** `C:\Users\stavie\Dualboots-1\insurance-risk-agents` with `(.venv)` active.

> IMPORTANT: Always use `requirements_upload.txt`, NOT `requirements.txt`

```powershell
orchestrate tools import -k python -f src/interpret_data.py -r requirements_upload.txt
orchestrate tools import -k python -f src/explain_risk.py -r requirements_upload.txt
orchestrate tools import -k python -f src/alert_check.py -r requirements_upload.txt
orchestrate tools import -k python -f src/suggest_actions.py -r requirements_upload.txt
```

Check tools (should show 4 EarthRisk tools):
```powershell
orchestrate tools list
```

```powershell
orchestrate agents import -f agents/data_interpreter_agent.yaml
orchestrate agents import -f agents/risk_explanation_agent.yaml
orchestrate agents import -f agents/alerting_agent.yaml
orchestrate agents import -f agents/decision_support_agent.yaml
```

Check agents (should show 4):
```powershell
orchestrate agents list -v
```

---

## PART 3 — Daily Usage (once everything is set up)

Every day you work on this, you need to start 2 things:

### Terminal 1 — Backend
```powershell
cd C:\Users\stavie\Dualboots-1\back-end\server
npm start
```
Leave this running. Don't close it.

### Terminal 2 — Frontend
```powershell
cd C:\Users\stavie\Dualboots-1\front-end\client
npm run dev
```
Leave this running. Open `http://localhost:5173` in your browser.

### Terminal 3 — Only if you need to update agents
```powershell
cd C:\Users\stavie\Dualboots-1\insurance-risk-agents
.venv\Scripts\activate
# now run any orchestrate commands you need
```

---

## PART 4 — Key Credentials Reference

| Credential | Where to find it | Used in |
|---|---|---|
| **MCSP API Key** | WatsonX Orchestrate UI → user icon → Settings → API details → Generate API key | `insurance-risk-agents\.env` AND `back-end\server\.env` as `WO_API_KEY` |
| **WO Instance URL** | WatsonX Orchestrate UI → Settings → API details → Service instance URL | Both `.env` files as `WO_INSTANCE` |
| **JWT_SECRET** | You made this up — any random string | `back-end\server\.env` |
| **DB_PASSWORD** | Your local MySQL password | `back-end\server\.env` |

---

## PART 5 — Known Issues & Fixes

### Wrong auth type error
```
Error: Provided API key could not be found., Status code: 400
```
**Fix:** Your env was set up with `--type ibm_iam`. Re-do it:
```powershell
orchestrate env remove -n hackathon
orchestrate env add -n hackathon -u https://api.eu-central-1.dl.watson-orchestrate.ibm.com/instances/YOUR_INSTANCE_ID --type mcsp --activate
```
Region `eu-central-1` (Frankfurt) = always use `--type mcsp`.

---

### Tool import version error
```
Could not find ibm-watsonx-orchestrate@2.6.0 on https://pypi.org/project/ibm-watsonx-orchestrate
```
**Fix:** Use `requirements_upload.txt` instead of `requirements.txt`:
```powershell
orchestrate tools import -k python -f src/yourfile.py -r requirements_upload.txt
```

---

### `orchestrate: command not found`
**Fix:** You forgot to activate the venv:
```powershell
cd C:\Users\stavie\Dualboots-1\insurance-risk-agents
.venv\Scripts\activate
```

---

### Knowledge base shows 0
Not a problem. Agents don't need a knowledge base — they use Python tools. Ignore this.

---

## PART 6 — Agent IDs on IBM (for the backend)

These are the permanent IBM UUIDs for the deployed agents.
If you ever need to update `agentController.js`:

| Agent | IBM UUID |
|---|---|
| Risk_Explanation_Agent | `aacdc499-86a4-4486-b02c-335b0a6e08ee` |
| Alerting_Agent | `fed05384-4974-4aab-a237-3e48c06e1a51` |
| Data_Interpreter_Agent | `4e2d2846-e26d-451f-8e45-381d9a29014c` |
| Decision_Support_Agent | Run `orchestrate agents list -v` to get this ID |

To get any agent's ID:
```powershell
# (with .venv active)
cd C:\Users\stavie\Dualboots-1\insurance-risk-agents
.venv\Scripts\activate
orchestrate agents list -v
```
Look for `"id": "..."` next to the agent name.

---

## PART 7 — App Routes

| URL | What you see |
|---|---|
| `http://localhost:5173` | Redirects to map |
| `http://localhost:5173/map` | Main map with risk heatmap |
| `http://localhost:5173/chat` | AI Agent chat interface |
| `http://localhost:5173/map/building/:id` | Individual building risk page |
| `http://localhost:5173/profile` | User profile (login required) |
| `http://localhost:5173/stats` | Admin analytics (admin role required) |

---

## PART 8 — File Structure That Matters

```
Dualboots-1/
│
├── back-end/server/
│   ├── .env                          ← DB + JWT + WO credentials (NEVER commit)
│   ├── index.js                      ← Express app entry point (port 9876)
│   ├── controllers/
│   │   └── agentController.js        ← IBM token exchange + Orchestrate API calls
│   └── routes/
│       └── agentRoutes.js            ← GET /api/agent/list, POST /api/agent/chat
│
├── front-end/client/
│   └── src/
│       ├── pages/Chat.jsx            ← AI chat UI page
│       ├── styles/Chat.css           ← Chat page styling
│       └── App.jsx                   ← Route definitions (includes /chat)
│
└── insurance-risk-agents/
    ├── .env                          ← WO_INSTANCE + WO_API_KEY (NEVER commit)
    ├── requirements.txt              ← Local Python packages (for your PC)
    ├── requirements_upload.txt       ← IBM server packages (use for imports)
    ├── .venv/                        ← Python virtual env (orchestrate lives here)
    ├── src/                          ← Python tool files
    └── agents/                       ← YAML agent definitions
```
