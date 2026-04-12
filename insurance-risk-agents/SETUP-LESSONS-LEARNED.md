# EarthRisk — Setup Lessons Learned
### Things that broke and how we fixed them

---

## 1. Wrong authentication type (CRITICAL)

**Error:**
```
[WARNING] - Overriding the default authentication type 'mcsp' for url '...' with 'ibm_iam'
ibm_cloud_sdk_core.api_exception.ApiException: Error: Provided API key could not be found., Status code: 400
```

**Why it happened:**
The instance is hosted in **eu-central-1** (Frankfurt). That region uses **MCSP** authentication, not IBM IAM. Running `orchestrate env add` with `--type ibm_iam` silently overrides the correct default and then fails.

**Fix:**
```powershell
# Remove the broken environment
orchestrate env remove -n hackathon

# Re-add with the correct type
orchestrate env add -n hackathon -u https://api.eu-central-1.dl.watson-orchestrate.ibm.com/instances/YOUR_INSTANCE_ID --type mcsp --activate
```

**Where to get the MCSP API key:**
- Go to the WatsonX Orchestrate UI (NOT IBM Cloud)
- User icon (top right) → Settings → "API details" tab
- Click "Generate API key" → copy it immediately (shown once only)

**Rule going forward:** If your WO instance URL contains `dl.watson-orchestrate.ibm.com` → always use `--type mcsp`.

---

## 2. Tool import fails because of ibm-watsonx-orchestrate version

**Error:**
```
[ERROR] - Could not find ibm-watsonx-orchestrate@2.6.0 on https://pypi.org/project/ibm-watsonx-orchestrate
[ERROR] - Failed to find tool. No tools found with the name 'suggest_insurance_actions'
```

**Why it happened:**
The `requirements.txt` includes `ibm-watsonx-orchestrate` as a dependency. When you run `orchestrate tools import -r requirements.txt`, IBM's servers try to install that package from PyPI — but version `2.6.0` (the version installed in your local venv) doesn't exist on PyPI. IBM's servers already have the package, so listing it causes a conflict.

**Fix:**
Use `requirements_upload.txt` instead of `requirements.txt` for all tool imports. This file has everything except `ibm-watsonx-orchestrate`:

```
numpy
pandas
scikit-learn
requests
```

**Command to use:**
```powershell
orchestrate tools import -k python -f src/suggest_actions.py -r requirements_upload.txt
```

**Rule going forward:** Always use `-r requirements_upload.txt` (not `requirements.txt`) when importing tools to IBM.

---

## 3. Instance details (for reference)

| Field | Value |
|---|---|
| Instance URL | `https://api.eu-central-1.dl.watson-orchestrate.ibm.com/instances/YOUR_INSTANCE_ID` |
| Region | eu-central-1 (Frankfurt) |
| Auth type | `mcsp` |
| Environment name | `hackathon` |

---

## 4. Knowledge base showing 0 — this is fine

The agents show `"knowledge_base": []` in their config. This is **not an error**. It just means no documents have been uploaded. The agents don't need documents — they use Python tools to compute risk scores. Ignore this.

---

## 5. Correct order to set everything up from scratch

If you ever need to redo this from the beginning:

**You are in:** `C:\Users\stavie\Dualboots-1\insurance-risk-agents` with `(.venv)` active.

```powershell
# 1. Activate venv (always do this first)
.venv\Scripts\activate

# 2. Connect to IBM (use mcsp, not ibm_iam)
orchestrate env add -n hackathon -u https://api.eu-central-1.dl.watson-orchestrate.ibm.com/instances/YOUR_INSTANCE_ID --type mcsp --activate

# 3. Import tools (use requirements_upload.txt, not requirements.txt)
orchestrate tools import -k python -f src/interpret_data.py -r requirements_upload.txt
orchestrate tools import -k python -f src/explain_risk.py -r requirements_upload.txt
orchestrate tools import -k python -f src/alert_check.py -r requirements_upload.txt
orchestrate tools import -k python -f src/suggest_actions.py -r requirements_upload.txt

# 4. Verify tools (should show 4 EarthRisk tools)
orchestrate tools list

# 5. Import agents
orchestrate agents import -f agents/data_interpreter_agent.yaml
orchestrate agents import -f agents/risk_explanation_agent.yaml
orchestrate agents import -f agents/alerting_agent.yaml
orchestrate agents import -f agents/decision_support_agent.yaml

# 6. Verify agents (should show 4 agents)
orchestrate agents list -v
```

---

## 6. Files in this folder and what they do

```
C:\Users\stavie\Dualboots-1\insurance-risk-agents\
│
├── .env                        ← Your secret keys (NEVER commit to GitHub)
├── requirements.txt            ← Local Python packages (for your PC only)
├── requirements_upload.txt     ← Packages for IBM servers (use this for imports)
│
├── src\
│   ├── interpret_data.py       ← Tool 1: reads building data, produces summary
│   ├── explain_risk.py         ← Tool 2: calculates risk score + explains it
│   ├── alert_check.py          ← Tool 3: generates alert when score > 65
│   └── suggest_actions.py      ← Tool 4: premium suggestions for underwriter
│
└── agents\
    ├── data_interpreter_agent.yaml     ← Agent 1
    ├── risk_explanation_agent.yaml     ← Agent 2 (main demo agent)
    ├── alerting_agent.yaml             ← Agent 3
    └── decision_support_agent.yaml     ← Agent 4
```
