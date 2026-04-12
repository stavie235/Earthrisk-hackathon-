# Agents Setup — For Dummies
### No code knowledge needed. Just copy-paste.

---

## What is happening here? (The big picture)

You have a website (EarthRisk) that shows buildings on a map with risk scores.

Right now, the risk scores are just numbers. The goal is to add **AI agents** that can:
- **Explain** why a building is risky (in Greek)
- **Alert** the insurance team when risk is too high
- **Suggest** what to do (raise premium, offer discount, etc.)

These AI agents live on IBM's servers (called **watsonx Orchestrate**).
You talk to them through a chat interface — like ChatGPT but for insurance.

---

## What you already did ✅

- Installed the tools on your computer
- Connected your computer to IBM's servers
- The agents are written and ready — they just need to be "uploaded"

---

## What you need to do now

### STEP 1 — Open the right terminal window

You need the PowerShell window that shows `(.venv)` at the start.
It looks like this:
```
(.venv) PS C:\Users\stavie\Dualboots-1\insurance-risk-agents>
```

If you don't have it open, do this:
1. Open PowerShell
2. Type this and press Enter:
```powershell
cd C:\Users\stavie\Dualboots-1\insurance-risk-agents
.venv\Scripts\activate
```
Now you should see `(.venv)` at the start.

---

### STEP 2 — Upload the 3 Python tools to IBM

Think of "tools" as the calculator inside the agent's brain.
You need to upload them to IBM so the agents can use them.

Copy-paste each line one by one and press Enter. Wait for each one to finish.

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

Then check they uploaded:
```powershell
orchestrate tools list
```
You should see 3 names:
- `interpret_satellite_data`
- `calculate_and_explain_risk`
- `generate_risk_alert`

If you see them →

---

### STEP 3 — Upload the 3 AI Agents to IBM

Agents are the "brains" that use the tools above to have a conversation.

```powershell
orchestrate agents import -f agents/data_interpreter_agent.yaml
```
Then:
```powershell
orchestrate agents import -f agents/risk_explanation_agent.yaml
```
Then:
```powershell
orchestrate agents import -f agents/alerting_agent.yaml
```

Then check:
```powershell
orchestrate agents list -v
```
You should see 3 agent names. If yes →

---

### STEP 4 — Open the chat UI

This opens a webpage where you can talk to your agents.

```powershell
orchestrate chat start
```

It will say something like:
```
Chat UI available at http://localhost:3000
```

Open that link in your browser (Chrome/Edge).

---

### STEP 5 — Run Demo Scenario 1

In the chat window that opened, find the **Risk_Explanation_Agent** and click it.

Then paste this message exactly:

```
Ανάλυσε το κτίριο στην Κεφαλληνία. Σεισμικός κίνδυνος: 88, ηφαιστειακός: 5,
απόσταση πυροσβεστικής: 32 χλμ, ημέρες καύσωνα: 24, βροχερές ημέρες: 3,
ηλικία κτιρίου: 55 χρόνια, αποζημιώσεις: 2, υλικό: Ξύλο, περιβάλλον: Κοντά σε Δάσος
```

Press Enter.

The agent should respond in Greek with:
- A risk score (should be very high, 80+)
- An explanation of WHY it's dangerous
- An alert saying immediate action is needed

---

## If something goes wrong

| Problem | Fix |
|---------|-----|
| `orchestrate: command not found` | You're not in the venv. Run `.venv\Scripts\activate` first |
| Tool import fails | Paste the error here and ask for help |
| Chat doesn't open | Try opening `http://localhost:3000` manually in your browser |
| Agent gives a weird response | Try rephrasing — ask in English if Greek doesn't work |

---

## What each agent does (plain English)

| Agent | Job |
|-------|-----|
| **Data_Interpreter_Agent** | Reads the raw numbers and says "here's what they mean" |
| **Risk_Explanation_Agent** | Calculates the risk score and explains why it's high or low |
| **Alerting_Agent** | Sends an urgent alert when risk is too high, with recommended actions |

---

## After Scenario 1 works — what's next?

1. Test Scenario 2 (medium risk building in Thessaloniki)
2. Test Scenario 3 (trend alert — risk jumped 50% in 2 weeks)
3. Upload the 4th agent (Decision Support) for premium suggestions

All scenarios are in `demo_scenarios.md` — just copy-paste them one by one.
