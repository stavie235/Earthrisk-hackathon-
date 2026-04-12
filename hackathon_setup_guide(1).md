# IBM watsonx Orchestrate — Hackathon Setup Guide
## Insurance Risk AI Agents — Βήμα-Βήμα

---

## ΦΑΣΗ 1: Στήσιμο λογαριασμού & περιβάλλοντος

### Βήμα 1 — Ενεργοποίηση watsonx Orchestrate

1. Πάνε στο **https://www.ibm.com/products/watsonx-orchestrate**
2. Κλίκαρε **"Try it for free"** (30-day trial)
3. Κάνε login με το υπάρχον IBM ID σου
4. Στη σελίδα "Deploy your trial":
   - Διάλεξε **Deployment Region** (π.χ. `us-south` ή `eu-de`)
   - Δώσε ένα **Deployment Name** (π.χ. `insurance-risk-hackathon`)
   - Κλίκαρε **"Create trial instance"**
5. Περίμενε ~2 λεπτά → θα δεις "Your trial is ready"
6. Κλίκαρε **"Access your trial now"** → ανοίγει η κονσόλα του Orchestrate

### Βήμα 2 — Πάρε τα API credentials

1. Μέσα στο watsonx Orchestrate UI, πάνε πάνω δεξιά → **user icon** → **Settings**
2. Πάνε στο tab **"API details"**
3. Αντέγραψε το **Service instance URL** (θα μοιάζει κάπως: `https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/xxxxx`)
4. Κλίκαρε **"Generate API key"** → σε πάει στο IBM Cloud IAM
5. Κλίκαρε **Create** → δώσε όνομα (π.χ. `hackathon-key`)
6. **ΣΗΜΑΝΤΙΚΟ: Αντέγραψε ΑΜΕΣΩΣ το API key** — δεν μπορείς να το δεις ξανά μετά!
7. Σώσε τα σε ένα ασφαλές μέρος:
   ```
   WO_INSTANCE=https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/xxxxx
   WO_API_KEY=your_api_key_here
   ```

### Βήμα 3 — Εγκατάσταση ADK (Agent Development Kit) στον υπολογιστή σου

Άνοιξε terminal και τρέξε:

```bash
# 1. Φτιάξε φάκελο για το project
mkdir insurance-risk-agents
cd insurance-risk-agents

# 2. Φτιάξε Python virtual environment (χρειάζεται Python 3.11+)
python3.11 -m venv .venv
source ./.venv/bin/activate    # Mac/Linux
# .venv\Scripts\activate       # Windows

# 3. Εγκατάστησε το ADK
pip install --upgrade ibm-watsonx-orchestrate

# 4. Τσέκαρε ότι δουλεύει
orchestrate --version
```

### Βήμα 4 — Σύνδεσε ADK με watsonx Orchestrate

```bash
# Φτιάξε .env αρχείο
cat > .env << EOF
WO_DEVELOPER_EDITION_SOURCE=orchestrate
WO_INSTANCE=<βάλε_το_service_instance_url_σου>
WO_API_KEY=<βάλε_το_api_key_σου>
EOF

# Πρόσθεσε και ενεργοποίησε το environment
orchestrate env add \
  -n hackathon \
  -u <το_service_instance_url_σου> \
  --type ibm_iam \
  --activate
```

Θα σε ρωτήσει για API key → βάλε αυτό που πήρες στο Βήμα 2.

### Βήμα 5 — Φτιάξε τη δομή φακέλων

```bash
mkdir -p agents tools src
```

Η δομή θα μοιάζει:
```
insurance-risk-agents/
├── .env
├── agents/
│   ├── data_interpreter_agent.yaml
│   ├── risk_explanation_agent.yaml
│   └── alerting_agent.yaml
├── tools/
│   └── (YAML tool definitions αν χρειαστούν)
├── src/
│   ├── interpret_data.py
│   ├── explain_risk.py
│   └── alert_check.py
└── requirements.txt
```

---

## ΦΑΣΗ 2: Φτιάξε τα Python Tools

Κάθε agent χρειάζεται "tools" — Python functions που κάνουν τη δουλειά.

### Βήμα 6 — Tool #1: Data Interpreter (τυλίγεις τον αλγόριθμό σου εδώ)

Φτιάξε αρχείο `src/interpret_data.py`:

```python
from ibm_watsonx_orchestrate.agent_builder.tools import tool

@tool
def interpret_satellite_data(
    region_name: str,
    temperature_delta: float,
    vegetation_index: float,
    building_age_years: int
) -> str:
    """Interprets raw environmental data and returns a human-readable summary.

    Args:
        region_name (str): Name of the geographic region being analyzed
        temperature_delta (float): Temperature change in Celsius over the period
        vegetation_index (float): NDVI vegetation index (0.0 to 1.0)
        building_age_years (int): Average building age in years for the region

    Returns:
        str: Human-readable interpretation of the environmental data
    """
    # ΕΔΩ ΒΑΖΕΙΣ ΤΟΝ ΔΙΚΟ ΣΟΥ ΑΛΓΟΡΙΘΜΟ
    # Αυτό είναι placeholder - αντικατέστησέ το με τον κώδικα που έχεις ήδη
    
    findings = []
    
    if temperature_delta > 1.5:
        findings.append(f"Η περιοχή {region_name} έχει +{temperature_delta}°C αύξηση θερμοκρασίας")
    
    if vegetation_index < 0.3:
        findings.append(f"Μείωση βλάστησης (NDVI: {vegetation_index}) → αυξημένος fire risk")
    elif vegetation_index < 0.5:
        findings.append(f"Μέτρια βλάστηση (NDVI: {vegetation_index}) → παρακολούθηση απαιτείται")
    
    if building_age_years > 30:
        findings.append(f"Παλιές κατασκευές (~{building_age_years} ετών) → αυξημένη ευπάθεια")
    
    if not findings:
        return f"Η περιοχή {region_name} βρίσκεται σε φυσιολογικά επίπεδα."
    
    return "Ευρήματα:\n" + "\n".join(f"• {f}" for f in findings)
```

### Βήμα 7 — Tool #2: Risk Scorer & Explainer

Φτιάξε αρχείο `src/explain_risk.py`:

```python
from ibm_watsonx_orchestrate.agent_builder.tools import tool

@tool
def calculate_and_explain_risk(
    region_name: str,
    temperature_delta: float,
    vegetation_index: float,
    building_age_years: int,
    alert_threshold: float = 0.7
) -> str:
    """Calculates a risk score and provides a detailed explanation of risk factors.

    Args:
        region_name (str): Name of the region
        temperature_delta (float): Temperature change in Celsius
        vegetation_index (float): NDVI vegetation index (0.0 to 1.0)
        building_age_years (int): Average building age in years
        alert_threshold (float): Risk threshold for triggering alerts (0.0 to 1.0)

    Returns:
        str: Risk score, explanation, and alert status
    """
    # Υπολόγισε weighted risk score
    temp_risk = min(temperature_delta / 5.0, 1.0) * 0.35
    veg_risk = (1.0 - vegetation_index) * 0.35
    building_risk = min(building_age_years / 50.0, 1.0) * 0.30
    
    total_risk = temp_risk + veg_risk + building_risk
    
    # Risk level
    if total_risk >= 0.8:
        level = "ΚΡΙΤΙΚΟΣ"
    elif total_risk >= 0.6:
        level = "ΥΨΗΛΟΣ"
    elif total_risk >= 0.4:
        level = "ΜΕΤΡΙΟΣ"
    else:
        level = "ΧΑΜΗΛΟΣ"
    
    # Explanation
    factors = []
    if temp_risk > 0.15:
        factors.append(f"🌡 Υψηλή θερμοκρασία (+{temperature_delta}°C) — συνεισφορά: {temp_risk:.0%}")
    if veg_risk > 0.15:
        factors.append(f"🔥 Χαμηλή βλάστηση (NDVI: {vegetation_index}) — συνεισφορά: {veg_risk:.0%}")
    if building_risk > 0.10:
        factors.append(f"🏠 Παλιά κατασκευή ({building_age_years} ετών) — συνεισφορά: {building_risk:.0%}")
    
    result = f"📊 Περιοχή: {region_name}\n"
    result += f"⚠️ Επίπεδο κινδύνου: {level} ({total_risk:.0%})\n\n"
    result += "Λόγω:\n" + "\n".join(factors)
    
    # Alert check
    if total_risk >= alert_threshold:
        result += f"\n\n🚨 ALERT: Ξεπεράστηκε το threshold ({alert_threshold:.0%})!"
        result += f"\nΑπαιτείται άμεση δράση για την περιοχή {region_name}."
    
    return result
```

### Βήμα 8 — Tool #3: Alert Generator

Φτιάξε αρχείο `src/alert_check.py`:

```python
from ibm_watsonx_orchestrate.agent_builder.tools import tool

@tool
def generate_risk_alert(
    region_name: str,
    risk_score: float,
    previous_risk_score: float,
    days_period: int = 14
) -> str:
    """Generates real-time risk alerts when thresholds are breached.

    Args:
        region_name (str): Name of the region
        risk_score (float): Current risk score (0.0 to 1.0)
        previous_risk_score (float): Previous period risk score (0.0 to 1.0)
        days_period (int): Number of days between measurements

    Returns:
        str: Alert message with trend analysis and urgency level
    """
    change = risk_score - previous_risk_score
    change_pct = (change / max(previous_risk_score, 0.01)) * 100
    
    if risk_score >= 0.8:
        urgency = "ΚΡΙΣΙΜΟ"
    elif risk_score >= 0.6:
        urgency = "ΥΨΗΛΟ"
    else:
        urgency = "ΜΕΤΡΙΟ"
    
    trend = "↑" if change > 0 else "↓" if change < 0 else "→"
    
    alert = f"🚨 ALERT — {urgency}\n"
    alert += f"Περιοχή: {region_name}\n"
    alert += f"Risk Score: {risk_score:.0%} {trend} ({change_pct:+.1f}% σε {days_period} ημέρες)\n"
    
    if change_pct > 15:
        alert += "⚡ Ταχεία επιδείνωση — απαιτείται άμεση αξιολόγηση\n"
    
    if risk_score >= 0.8:
        alert += "\nΠροτεινόμενες ενέργειες:\n"
        alert += "• Αναθεώρηση premium pricing για την περιοχή\n"
        alert += "• Ειδοποίηση underwriting team\n"
        alert += "• Επανεκτίμηση exposure limits\n"
    
    return alert
```

### Βήμα 9 — Requirements file

Φτιάξε `requirements.txt`:

```
ibm-watsonx-orchestrate
requests
numpy
```

(Πρόσθεσε ότι άλλο χρειάζεται ο αλγόριθμός σου: pandas, scikit-learn, κλπ.)

---

## ΦΑΣΗ 3: Φτιάξε τους Agents (YAML definitions)

### Βήμα 10 — Agent #1: Data Interpreter

Φτιάξε `agents/data_interpreter_agent.yaml`:

```yaml
spec_version: v1
kind: native
name: Data_Interpreter_Agent
description: >
  Analyzes raw satellite and environmental data, interprets temperature trends,
  vegetation indices, and building conditions into human-readable insights.
instructions: |
  You are an Environmental Data Interpreter for an insurance risk platform.
  Your role is to take raw data (satellite imagery results, temperature deltas,
  vegetation indices, building ages) and convert them into clear, understandable
  summaries in Greek.

  When a user provides region data:
  1. Call the interpret_satellite_data tool with the provided values
  2. Present the findings clearly
  3. Highlight any concerning trends

  Always respond in Greek. Be specific with numbers.
  Never make recommendations — only interpret and describe the data.
llm: watsonx/ibm/granite-3-8b-instruct
style: react
collaborators: []
tools:
  - interpret_satellite_data
```

### Βήμα 11 — Agent #2: Risk Explanation

Φτιάξε `agents/risk_explanation_agent.yaml`:

```yaml
spec_version: v1
kind: native
name: Risk_Explanation_Agent
description: >
  Calculates risk scores for regions and explains the contributing factors.
  Triggers alerts when risk exceeds threshold.
instructions: |
  You are a Risk Assessment Specialist for an insurance company.
  Your role is to calculate and explain risk scores for geographic regions.

  When analyzing a region:
  1. Call calculate_and_explain_risk with the environmental data
  2. Present the risk level clearly with contributing factors
  3. If risk exceeds the threshold, emphasize the alert

  Important rules:
  - Always explain WHY the risk is high, not just the score
  - Use the weighted factors: temperature (35%), vegetation (35%), building age (30%)
  - If an alert is triggered, recommend that the Alerting Agent is consulted
  - Respond in Greek
  - Be precise with percentages and scores
llm: watsonx/ibm/granite-3-8b-instruct
style: react
collaborators:
  - Alerting_Agent
tools:
  - calculate_and_explain_risk
```

### Βήμα 12 — Agent #3: Alerting Agent

Φτιάξε `agents/alerting_agent.yaml`:

```yaml
spec_version: v1
kind: native
name: Alerting_Agent
description: >
  Generates real-time risk alerts with trend analysis when thresholds are breached.
instructions: |
  You are a Real-Time Risk Alert Specialist for an insurance platform.
  You monitor risk scores and generate urgent alerts when thresholds are breached.

  When called:
  1. Use generate_risk_alert to create the alert
  2. Present the urgency level clearly
  3. Include trend analysis (is risk increasing/decreasing?)
  4. List recommended actions based on urgency

  Rules:
  - Only activate when risk exceeds threshold
  - Always include trend direction and speed of change
  - Respond in Greek with clear formatting
llm: watsonx/ibm/granite-3-8b-instruct
style: react
collaborators: []
tools:
  - generate_risk_alert
```

---

## ΦΑΣΗ 4: Import & Test

### Βήμα 13 — Κάνε import τα tools

```bash
# Import κάθε tool ξεχωριστά
orchestrate tools import -k python -f src/interpret_data.py -r requirements.txt
orchestrate tools import -k python -f src/explain_risk.py -r requirements.txt
orchestrate tools import -k python -f src/alert_check.py -r requirements.txt

# Τσέκαρε ότι φαίνονται
orchestrate tools list
```

Πρέπει να δεις 3 tools: `interpret_satellite_data`, `calculate_and_explain_risk`, `generate_risk_alert`

### Βήμα 14 — Κάνε import τους agents

```bash
orchestrate agents import -f agents/data_interpreter_agent.yaml
orchestrate agents import -f agents/risk_explanation_agent.yaml
orchestrate agents import -f agents/alerting_agent.yaml

# Τσέκαρε
orchestrate agents list -v
```

### Βήμα 15 — Τεστάρισε!

**Επιλογή Α — Μέσω chat UI (εύκολο):**
Πήγαινε στο watsonx Orchestrate UI στον browser → δοκίμασε να μιλήσεις με τον agent:

> "Ανάλυσε την περιοχή Μάτι με temperature delta +3.2°C, vegetation index 0.18, building age 42 χρόνια"

**Επιλογή Β — Μέσω local Developer Edition:**
```bash
# Ξεκίνα τον local server (χρειάζεται Docker)
orchestrate server start --env-file .env

# Ξεκίνα το chat UI
orchestrate chat start
# Ανοίγει στο http://localhost:4321
```

---

## ΦΑΣΗ 5 (Stretch): Πρόσθεσε Decision Support & Market Agent

### Βήμα 16 — Decision Support Agent (αν μείνει χρόνος)

Φτιάξε `src/suggest_actions.py`:

```python
from ibm_watsonx_orchestrate.agent_builder.tools import tool

@tool
def suggest_insurance_actions(
    region_name: str,
    risk_score: float,
    risk_factors: str,
    current_premium: float
) -> str:
    """Generates insurance action suggestions based on risk assessment.
    NOTE: Suggestions only, never decisions.

    Args:
        region_name (str): Name of the region
        risk_score (float): Calculated risk score (0.0 to 1.0)
        risk_factors (str): Description of contributing risk factors
        current_premium (float): Current insurance premium for the region

    Returns:
        str: Ranked list of suggested actions with confidence levels
    """
    suggestions = []
    
    if risk_score >= 0.7:
        adj = min(risk_score * 25, 20)
        suggestions.append({
            "action": f"Αύξηση premium κατά {adj:.0f}% στην περιοχή {region_name}",
            "confidence": "Υψηλή",
            "rationale": f"Risk score {risk_score:.0%} υπερβαίνει σημαντικά το threshold"
        })
    
    if "βλάστηση" in risk_factors.lower() or "vegetation" in risk_factors.lower():
        suggestions.append({
            "action": f"Discount 5-10% αν ο ιδιοκτήτης εγκαταστήσει fire-resistant landscaping",
            "confidence": "Μέτρια",
            "rationale": "Η βελτίωση βλάστησης μειώνει fire risk"
        })
    
    if "κατασκευή" in risk_factors.lower() or "building" in risk_factors.lower():
        suggestions.append({
            "action": "Discount αν γίνει ανακαίνιση στέγης ή σεισμική ενίσχυση",
            "confidence": "Υψηλή",
            "rationale": "Νεότερες κατασκευές μειώνουν σημαντικά τον κίνδυνο"
        })
    
    if risk_score >= 0.8:
        suggestions.append({
            "action": f"Μείωση exposure limit στην περιοχή {region_name}",
            "confidence": "Υψηλή",
            "rationale": "Κρίσιμο risk level — απαιτείται de-risking"
        })
    
    result = f"📋 ΠΡΟΤΑΣΕΙΣ (όχι αποφάσεις) για {region_name}:\n\n"
    for i, s in enumerate(suggestions, 1):
        result += f"{i}. {s['action']}\n"
        result += f"   Confidence: {s['confidence']}\n"
        result += f"   Λόγος: {s['rationale']}\n\n"
    
    result += "⚠️ Οι παραπάνω είναι ΠΡΟΤΑΣΕΙΣ. Η τελική απόφαση ανήκει στον underwriter."
    return result
```

Κάνε import:
```bash
orchestrate tools import -k python -f src/suggest_actions.py -r requirements.txt
orchestrate agents import -f agents/decision_support_agent.yaml
```

---

## Χρήσιμα Links

| Τι | URL |
|----|-----|
| watsonx Orchestrate Console | https://www.ibm.com/products/watsonx-orchestrate |
| ADK Documentation | https://developer.watson-orchestrate.ibm.com/getting_started/installing |
| ADK GitHub (examples) | https://github.com/IBM/ibm-watsonx-orchestrate-adk |
| Example agents repo | https://github.com/IBM/orchestrate-adk-agent |
| Available LLM models | Τρέξε `orchestrate models list` στο terminal |

---

## Quick Troubleshooting

| Πρόβλημα | Λύση |
|----------|------|
| `orchestrate: command not found` | Ξανακάνε `source .venv/bin/activate` |
| API key error | Πάρε νέο key από Settings → API details |
| Tool import fails | Τσέκαρε ότι η function έχει σωστό `@tool` decorator και Google-style docstring |
| Agent δεν βρίσκει tool | Σιγουρέψου ότι το tool name στο YAML ταιριάζει ακριβώς με το function name |
| Docker issues (local) | Χρειάζεται Rancher ή Colima — `orchestrate server start` σου λέει τι λείπει |
