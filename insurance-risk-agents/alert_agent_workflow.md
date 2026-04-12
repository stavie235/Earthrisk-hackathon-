# Alerting Agent — Workflow

```mermaid
flowchart TD
    A([👤 Underwriter Message\nmentions BLD_XXXX or region]) --> B

    B[🔍 fetch_building_by_id\nBLD_XXXX → current data] --> C

    C{risk_score > 65?}
    C -- No --> D([✅ No Alert\nScore within safe range])
    C -- Yes --> E

    E[📂 fetch_building_history\nnumeric id → historical scores] --> F

    F[🧮 Resolve Previous Score\nmost recent record\nor 0 if no history] --> G

    G[⚙️ generate_risk_alert\ncurrent · previous · region · building_count] --> H

    H{Urgency Level}

    H -- score > 80 --> I[🔴 ΚΡΙΣΙΜΟ\n· Senior Underwriter alert\n· On-site inspection 48h\n· Exposure limit review]
    H -- score 65–80 --> J[🟠 ΥΨΗΛΟ\n· Underwriting team notify\n· Premium review for new contracts\n· Monitor every 7 days]

    I --> K
    J --> K

    K{Change > 20%\nin period?}
    K -- Yes --> L[⚡ Rapid Escalation Flag\nattached to alert]
    K -- No --> M

    L --> M[🤖 LLM Compose\nFormat alert in Greek\nurgency · trend · actions]

    M --> N([📋 Alert Output\nto Underwriting Team])

    style A fill:#1e293b,color:#fff,stroke:#334155
    style D fill:#166534,color:#fff,stroke:#15803d
    style N fill:#1e3a5f,color:#fff,stroke:#2563eb
    style I fill:#7f1d1d,color:#fff,stroke:#dc2626
    style J fill:#7c2d12,color:#fff,stroke:#ea580c
    style L fill:#713f12,color:#fff,stroke:#ca8a04
    style C fill:#1e293b,color:#fff,stroke:#475569
    style H fill:#1e293b,color:#fff,stroke:#475569
    style K fill:#1e293b,color:#fff,stroke:#475569
```

## Node Reference

| Node | Type | Tool / Logic |
|------|------|-------------|
| Underwriter Message | Trigger | BLD_XXXX detected in input |
| fetch_building_by_id | Tool call | Returns current `risk_score`, `prefecture`, numeric `id` |
| risk_score > 65? | Gate | Hard threshold — exits early if safe |
| fetch_building_history | Tool call | Returns year-by-year score records |
| Resolve Previous Score | Transform | `history[-1].risk_score` or `0` if empty |
| generate_risk_alert | Tool call | Computes change %, trend label, action list |
| Urgency Level | Router | > 80 → ΚΡΙΣΙΜΟ · 65–80 → ΥΨΗΛΟ |
| Change > 20%? | Gate | Attaches rapid escalation flag |
| LLM Compose | LLM (Llama 405B) | Narrates structured alert in Greek |
| Alert Output | Response | Delivered to underwriting team in chat |

## Urgency Thresholds

| Score | Level | Color | Key Action |
|-------|-------|-------|------------|
| > 80 | ΚΡΙΣΙΜΟ | 🔴 | Immediate senior escalation + 48h inspection |
| 65–80 | ΥΨΗΛΟ | 🟠 | Underwriting team review + 7-day monitoring |
| 35–65 | ΜΕΤΡΙΟ | 🟡 | Agent does not activate |
| < 35 | ΧΑΜΗΛΟ | 🟢 | Agent does not activate |

## Trend Labels

| Change | Label |
|--------|-------|
| > +10 pts | 📈🔴 ΤΑΧΕΙΑ ΕΠΙΔΕΙΝΩΣΗ |
| +5 to +10 pts | 📈🟡 ΣΤΑΔΙΑΚΗ ΑΥΞΗΣΗ |
| 0 to +5 pts | ↗️ ΕΛΑΦΡΑ ΑΥΞΗΣΗ |
| < −5 pts | 📉🟢 ΒΕΛΤΙΩΣΗ |
| stable | ➡️ ΣΤΑΘΕΡΟΠΟΙΗΣΗ |
