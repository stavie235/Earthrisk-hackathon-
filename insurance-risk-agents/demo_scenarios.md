# EarthRisk — Demo Script (Judge Walkthrough)
_Updated: 2026-03-28 | Target duration: 4–5 minutes_

---

## Pre-Demo Checklist

Before starting, confirm all of these:

- [ ] Backend running: `cd back-end/server && npm start` (port 9876)
- [ ] Frontend running: `cd front-end/client && npm run dev`
- [ ] ngrok tunnel active: `ngrok http 9876` — copy URL into `fetch_tools.py`
- [ ] WatsonX agents imported: `orchestrate tools import` + 4x `orchestrate agents import`
- [ ] Browser open at `/map`, logged in as admin
- [ ] Map loaded, buildings visible as colored dots

---

## Demo Flow

### Step 1 — The Map (30 sec)

> "This is EarthRisk. Every dot on this map is a real insured building. Red means high risk. We're in Greece."

- Pan to the **Kefalonia / Ionian Islands** area — cluster of red dots
- Point out the risk heatmap overlay
- Say: "The colors aren't just visual — they're backed by a live database and a risk scoring formula that weighs seismic activity, fire access, climate, building age, and historical claims."

---

### Step 2 — Building Detail (45 sec)

> "Let me click one."

- Click any red building in **Kefalonia** — ideally BLD_0387 (Razata)
- The sidebar/panel shows:
  - Risk Score: **79.0 / HIGH RISK**
  - Type: Wooden Airbnb villa, 48 years old
  - Coverage: Underinsured — declared €140,602 vs actual value €200,860
  - Annual premium: only **€332.85**

> "79 out of 100. Wooden construction. 48 years old. Near wildland. And the premium is €332 per year — that's clearly not reflecting the actual exposure."

---

### Step 3 — Risk Explanation Agent (60 sec)

> "Now let's ask the AI why."

- Navigate to `/chat`
- Select **Risk_Explanation_Agent** from the sidebar
- Click the quick prompt or paste:

```
Explain the risk profile of BLD_0290, a 53-year-old wooden Airbnb house in Attica (Cholargos). Risk score: 80.7/100. It is near wildland, has alarm and cameras but only basic coverage. Annual premium is just €172.04. Why is the risk so high and is the premium adequate?
```

**Expected output:** Agent breaks down the EarthRisk formula — seismic zone, proximity to wildland, construction material, age — and flags that €172/year for a score of 80.7 is a critical underpricing.

> "The agent fetched the building data directly from our database and explained exactly which factors are driving the score. No hallucination — grounded in real data."

---

### Step 4 — Alerting Agent (45 sec)

> "High-risk buildings need alerts. Let's generate one."

- Select **Alerting_Agent**
- Click the quick prompt or paste:

```
Generate a risk alert for Kefalonia (Κεφαλονιά). BLD_0387 scores 79.0 — wooden Airbnb villa, 48 years old, near wildland, underinsured by 30% (declared €140,602 vs actual €200,860), high crime rate. Risk has been climbing 4–5 points per year. What alert level and actions are required?
```

**Expected output:** `ΥΨΗΛΟ` (HIGH) alert, urgency classification, trend summary (rising ~5 pts/year), immediate recommended actions.

> "The agent classified it as HIGH urgency, detected the upward trend, and recommended immediate underwriter review. This would normally take an analyst hours to compile."

---

### Step 5 — Decision Support Agent (60 sec)

> "Now the underwriter needs to know what to actually do."

- Select **Decision_Support_Agent**
- Click the quick prompt or paste:

```
Suggest insurance actions for BLD_0387 in Kefalonia (Κεφαλονιά) (Razata): risk score 79.0 (High), wooden construction, 48 years old, Airbnb, near wildland, underinsured — declared €140,602 vs actual €200,860. Premium €332.85. Has alarm and cameras. What should the insurer change at renewal?
```

**Expected output:** Ranked recommendations — premium correction (likely +40–60%), seismic retrofitting discount incentive, updated coverage floor to match actual value, possible inspection requirement.

> "The agent gives the underwriter a ranked action list with justifications. The human makes the final call — the AI just makes sure nothing gets missed."

---

### Closing Line (15 sec)

> "EarthRisk turns geographic and climate data into actionable insurance intelligence, powered by IBM watsonx Orchestrate. From satellite data to policy decision — end to end."

---

## Backup Scenarios (if live agents are slow/unavailable)

Use these as fallbacks — manually narrate the expected outputs below.

### Backup A — Cross-building comparison (Risk Explanation Agent)

```
Compare BLD_0040 in Xanthi (risk score 6.4, 4-year-old concrete house, full coverage, alarm + cameras, not near nature, premium €43.37) vs BLD_0387 in Kefalonia (risk score 79.0, 48-year-old wooden Airbnb villa near wildland, underinsured at €140,602 vs actual €200,860). What explains the difference?
```

Expected: Agent highlights age, material, proximity to nature, seismic zone, and coverage gaps as key differentiators.

### Backup B — Island portfolio analysis (Data Interpreter Agent)

```
Analyze the risk pattern across these three island properties: BLD_0290 Attica score 80.7 wooden Airbnb age 53, BLD_0387 Kefalonia score 79.0 wooden Airbnb age 48 underinsured, BLD_0568 Heraklion score 78.6 wooden Airbnb age 36 high seismic. What common risk drivers do you identify and what does this mean for the insurer's island portfolio?
```

Expected: Agent surfaces wooden construction + Airbnb usage + island seismic zones as systemic portfolio risk.

---

## Key Numbers to Remember

| Building | Location | Score | Key Issue |
|----------|----------|-------|-----------|
| BLD_0290 | Attica (Cholargos) | 80.7 | Premium €172 — critically underpriced |
| BLD_0387 | Kefalonia (Razata) | 79.0 | Underinsured by 30%, rising trend |
| BLD_0568 | Heraklion, Crete | 78.6 | Seismic Zone 3, underinsured |
| BLD_0040 | Xanthi | 6.4 | LOW risk — good contrast |
| BLD_0002 | Cyclades | 64.4 | Score jumped from 48.0 in one year |

---

## Testing Checklist (run before the demo)

```bash
# 1. Backend health
curl http://localhost:9876/api/buildings/external/BLD_0387

# 2. High-risk building exists
curl http://localhost:9876/api/buildings/external/BLD_0290

# 3. Low-risk building exists (for contrast)
curl http://localhost:9876/api/buildings/external/BLD_0040

# 4. Portfolio stats (used by Decision Support Agent)
curl http://localhost:9876/api/adminStats/portfolio

# 5. Agent list
curl http://localhost:9876/api/agent/list
```

Each should return JSON with real data — if any return 404 or empty, check DB seed.

---

## EarthRisk Score Formula (for Q&A)

```
Score = Seismic(30%) + Volcanic(10%) + Fire_Access(20%) + Climate(20%) + Age(10%) + Claims(10%)
Score > 65  →  HIGH RISK
Score 35–65 →  MEDIUM RISK
Score < 35  →  LOW RISK
```
