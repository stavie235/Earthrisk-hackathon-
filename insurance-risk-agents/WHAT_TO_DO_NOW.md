# What To Do Now — EarthRisk AI Agents
### Plain English. No tech jargon. Exact paths every time.

---

## First — What You Have (Plain English)

Think of it like cooking. You have:

| Thing you have | What it actually is |
|---|---|
| **WO API Key** | Your password to talk to IBM's AI servers |
| **WO Instance URL** | The address of IBM's AI servers (where your agents will live) |
| **IBM Cloud CLI** (locally installed) | A terminal tool for managing your IBM Cloud account |
| **IBM WatsonX Orchestrate** | The AI platform where your agents run (like a brain farm on IBM's servers) |
| **The .venv folder** | A mini Python environment on your PC — this is where `orchestrate` is already installed |
| **The Python files (src/)** | The actual logic of your agents — already written, ready to upload |
| **The YAML files (agents/)** | Configuration files that tell IBM "here's an agent, here's what it does" |

---

## What Needs To Happen (Big Picture)

```
STEP 1 — Fill in your secret keys (.env file)
STEP 2 — Open the right terminal + activate the venv
STEP 3 — Connect orchestrate to IBM (one-time setup)
STEP 4 — Upload your Python tools to IBM
STEP 5 — Upload your agents to IBM
STEP 6 — Open the chat UI and test
```

---

## STEP 1 — Fill In Your Secret Keys

You need to put your real WO credentials into the `.env` file.

**Open this file in VS Code:**
```
C:\Users\stavie\Dualboots-1\insurance-risk-agents\.env
```

It currently looks like this:
```
WO_DEVELOPER_EDITION_SOURCE=orchestrate
WO_INSTANCE=https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/YOUR_INSTANCE_ID
WO_API_KEY=YOUR_API_KEY_HERE
```

Replace it with your real values:
```
WO_DEVELOPER_EDITION_SOURCE=orchestrate
WO_INSTANCE=<paste your full instance URL here>
WO_API_KEY=<paste your API key here>
```

**Where to find these values:**
1. Go to your WatsonX Orchestrate website (the one IBM gave you)
2. Click your user icon (top right) → **Settings**
3. Click the **"API details"** tab
4. Copy the **Service instance URL** → that's your `WO_INSTANCE`
5. Click **"Generate API key"** → copy it immediately → that's your `WO_API_KEY`

> DO NOT share these with anyone. DO NOT commit this file to GitHub.

---

## STEP 2 — Open The Right Terminal

You MUST use the terminal that has the `.venv` active. Here's how:

1. Open **PowerShell** (search it in the Windows start menu)
2. Type this and press Enter:

```powershell
cd C:\Users\stavie\Dualboots-1\insurance-risk-agents
```

3. Then activate the venv:

```powershell
.venv\Scripts\activate
```

4. Your prompt should now start with `(.venv)` like this:
```
(.venv) PS C:\Users\stavie\Dualboots-1\insurance-risk-agents>
```

If you don't see `(.venv)` — STOP. Do not continue until you see it.

> Every command from here on is run from this exact location:
> `C:\Users\stavie\Dualboots-1\insurance-risk-agents`
> with `(.venv)` active.

---

## STEP 3 — Connect Orchestrate To IBM (One-Time Setup)

**You are in:** `C:\Users\stavie\Dualboots-1\insurance-risk-agents` with `(.venv)` active.

Run this (replace the URL with your real WO_INSTANCE value):

```powershell
orchestrate env add -n hackathon -u YOUR_WO_INSTANCE_URL_HERE --type ibm_iam --activate
```

Example (with a fake URL so you understand the format):
```powershell
orchestrate env add -n hackathon -u https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/abc123 --type ibm_iam --activate
```

It will ask: `Enter API key:`
→ Paste your `WO_API_KEY` and press Enter.

**Check it worked:**
```powershell
orchestrate env list
```
You should see `hackathon` in the list with a checkmark or `(active)`.

---

## STEP 4 — Upload Your Python Tools To IBM

**You are in:** `C:\Users\stavie\Dualboots-1\insurance-risk-agents` with `(.venv)` active.

Run these one at a time. Wait for each to finish before running the next:

```powershell
orchestrate tools import -k python -f src/interpret_data.py -r requirements.txt
```
Wait... then:
```powershell
orchestrate tools import -k python -f src/explain_risk.py -r requirements.txt
```
Wait... then:
```powershell
orchestrate tools import -k python -f src/alert_check.py -r requirements.txt
```

**Check they uploaded:**
```powershell
orchestrate tools list
```

You should see these 3 names:
- `interpret_satellite_data`
- `calculate_and_explain_risk`
- `generate_risk_alert`

If you see them → go to Step 5.
If you don't → copy the error message and ask for help.

---

## STEP 5 — Upload Your Agents To IBM

**You are in:** `C:\Users\stavie\Dualboots-1\insurance-risk-agents` with `(.venv)` active.

```powershell
orchestrate agents import -f agents/data_interpreter_agent.yaml
```
Wait... then:
```powershell
orchestrate agents import -f agents/risk_explanation_agent.yaml
```
Wait... then:
```powershell
orchestrate agents import -f agents/alerting_agent.yaml
```

**Check they uploaded:**
```powershell
orchestrate agents list -v
```

You should see 3 agents. If yes → go to Step 6.

---

## STEP 6 — Test In The Chat UI

Go to your **WatsonX Orchestrate website** in the browser.

Find the agent called **Risk_Explanation_Agent** and click it.

Paste this message and press Enter:

```
Ανάλυσε το κτίριο στην Κεφαλληνία. Σεισμικός κίνδυνος: 88, ηφαιστειακός: 5,
απόσταση πυροσβεστικής: 32 χλμ, ημέρες καύσωνα: 24, βροχερές ημέρες: 3,
ηλικία κτιρίου: 55 χρόνια, αποζημιώσεις: 2, υλικό: Ξύλο, περιβάλλον: Κοντά σε Δάσος
```

**Expected result:** The agent responds with a HIGH RISK score (80+) in Greek with explanations.

If it works → you're done with the agent setup!

---

## If Something Goes Wrong

| What you see | What to do |
|---|---|
| `orchestrate: command not found` | You forgot to activate the venv. Run `.venv\Scripts\activate` in `C:\Users\stavie\Dualboots-1\insurance-risk-agents` |
| `Authentication failed` or `401` | Your API key is wrong. Go back to Step 1 and double-check your .env |
| `Tool import failed` | Copy the exact error and ask for help |
| Agent doesn't appear in the website | Wait 1-2 minutes and refresh the page |
| The chat gives a weird answer | Try asking in English first, then Greek |

---

## Quick Reminder — What Each File Does

```
C:\Users\stavie\Dualboots-1\insurance-risk-agents\
│
├── .env                          ← Your secret keys (NEVER share this)
├── requirements.txt              ← List of Python packages the tools need
│
├── src\
│   ├── interpret_data.py         ← Tool 1: reads raw data
│   ├── explain_risk.py           ← Tool 2: calculates risk score
│   ├── alert_check.py            ← Tool 3: generates alerts
│   └── suggest_actions.py        ← Tool 4: premium suggestions (upload later)
│
└── agents\
    ├── data_interpreter_agent.yaml     ← Agent 1
    ├── risk_explanation_agent.yaml     ← Agent 2
    ├── alerting_agent.yaml             ← Agent 3
    └── decision_support_agent.yaml     ← Agent 4 (upload later)
```

---

## Where You Are Right Now

- [x] IBM Cloud account — you have it
- [x] WO API Key — you have it
- [x] WO Instance URL — you have it
- [x] orchestrate is installed (in the .venv)
- [x] All Python files are written and ready
- [x] All YAML agent files are ready
- [ ] .env filled in with real keys  ← **START HERE**
- [ ] orchestrate connected to IBM
- [ ] Tools uploaded
- [ ] Agents uploaded
- [ ] Demo tested
