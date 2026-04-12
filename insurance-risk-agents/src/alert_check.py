from ibm_watsonx_orchestrate.agent_builder.tools import tool


@tool
def generate_risk_alert(
    region_name: str,
    current_score: float,
    previous_score: float,
    days_period: int = 14,
    building_count: int = 1,
) -> str:
    """Generates a real-time insurance risk alert when thresholds are breached.

    Performs trend analysis to determine if risk is escalating and recommends
    immediate actions for the underwriting team. Only call when score > 65.

    Args:
        region_name (str): Name of the region
        current_score (float): Current EarthRisk score (0-100)
        previous_score (float): EarthRisk score from previous period (0-100)
        days_period (int): Number of days between measurements (default 14)
        building_count (int): Number of insured buildings affected

    Returns:
        str: Formatted alert message with urgency, trend analysis, and recommended actions
    """
    change = current_score - previous_score
    change_pct = (change / max(previous_score, 0.01)) * 100

    # Urgency level
    if current_score > 80:
        urgency = "ΚΡΙΣΙΜΟ"
        urgency_icon = "🔴"
    elif current_score > 65:
        urgency = "ΥΨΗΛΟ"
        urgency_icon = "🟠"
    elif current_score > 35:
        urgency = "ΜΕΤΡΙΟ"
        urgency_icon = "🟡"
    else:
        urgency = "ΧΑΜΗΛΟ"
        urgency_icon = "🟢"

    # Trend
    if change > 10:
        trend_label = "ΤΑΧΕΙΑ ΕΠΙΔΕΙΝΩΣΗ"
        trend_icon = "📈🔴"
    elif change > 5:
        trend_label = "ΣΤΑΔΙΑΚΗ ΑΥΞΗΣΗ"
        trend_icon = "📈🟡"
    elif change > 0:
        trend_label = "ΕΛΑΦΡΑ ΑΥΞΗΣΗ"
        trend_icon = "↗️"
    elif change < -5:
        trend_label = "ΒΕΛΤΙΩΣΗ"
        trend_icon = "📉🟢"
    else:
        trend_label = "ΣΤΑΘΕΡΟΠΟΙΗΣΗ"
        trend_icon = "➡️"

    alert = f"{urgency_icon} ALERT — ΕΠΙΠΕΔΟ: {urgency}\n"
    alert += "=" * 45 + "\n"
    alert += f"📍 Περιοχή: {region_name}\n"
    alert += f"🏢 Ασφαλισμένα κτίρια: {building_count}\n\n"

    alert += f"📊 ΣΤΟΙΧΕΙΑ:\n"
    alert += f"  Τρέχον Score:   {current_score:.1f} / 100\n"
    alert += f"  Προηγούμενο:    {previous_score:.1f} / 100\n"
    alert += f"  Μεταβολή:       {change:+.1f} μονάδες ({change_pct:+.1f}%) σε {days_period} ημέρες\n"
    alert += f"  Τάση:           {trend_icon} {trend_label}\n\n"

    # Escalation warning
    if abs(change_pct) > 20:
        alert += f"⚡ ΤΑΧΕΙΑ ΜΕΤΑΒΟΛΗ: Το risk score άλλαξε {change_pct:+.1f}% μέσα σε {days_period} ημέρες!\n\n"

    # Recommended actions based on urgency
    alert += "📋 ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΕΝΕΡΓΕΙΕΣ:\n"

    if current_score > 80:
        alert += "  1. 🚨 Άμεση ειδοποίηση Senior Underwriter\n"
        alert += "  2. 📄 Αναθεώρηση όλων των ενεργών ασφαλιστηρίων στην περιοχή\n"
        alert += "  3. 💰 Επανεκτίμηση exposure limits\n"
        alert += "  4. 🔍 On-site επιθεώρηση εντός 48 ωρών\n"
        alert += "  5. 📊 Αναθεώρηση premium pricing\n"
    elif current_score > 65:
        alert += "  1. ⚠️ Ειδοποίηση Underwriting Team\n"
        alert += "  2. 📋 Επανεξέταση premium για νέα συμβόλαια στην περιοχή\n"
        alert += "  3. 📈 Παρακολούθηση τάσης ανά 7 ημέρες\n"
    elif change_pct > 15:
        alert += "  1. 👁️ Αυξημένη παρακολούθηση — επανέλεγχος σε 7 ημέρες\n"
        alert += "  2. 📝 Σημείωση στο αρχείο της περιοχής\n"

    return alert
