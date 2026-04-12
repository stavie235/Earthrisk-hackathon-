from ibm_watsonx_orchestrate.agent_builder.tools import tool


@tool
def suggest_insurance_actions(
    external_id: str,
    region_name: str,
    address: str,
    construction_material: str,
    year_built: int,
    earthquake_zone: str,
    flood_zone: str,
    fire_risk: str,
    near_nature: bool,
    nasa_avg_temp_c: float,
    crime_rate: str,
    risk_score: float,
    risk_category: str,
    annual_premium_euro: float,
    actual_value_euro: float,
    declared_value_euro: float,
    underinsured: bool,
) -> str:
    """Generates ranked insurance action suggestions based on real building data from the EarthRisk database.

    IMPORTANT: These are SUGGESTIONS only. All final decisions must be made
    by the human underwriter. This agent never decides — it advises.

    All parameters come directly from the Building table in the database.
    Do NOT ask the user for any of these values — they are provided automatically.

    Args:
        external_id (str): Building ID, e.g. BLD_0290
        region_name (str): Greek prefecture / municipality name
        address (str): Full street address
        construction_material (str): concrete | wood | prefab
        year_built (int): Year the building was constructed
        earthquake_zone (str): Zone 1 (low) | Zone 2 (medium) | Zone 3 (high)
        flood_zone (str): none | low | medium | high
        fire_risk (str): low | medium | high
        near_nature (bool): True if building is near forest/wildland
        nasa_avg_temp_c (float): NASA-derived average temperature in Celsius
        crime_rate (str): low | medium | high
        risk_score (float): EarthRisk composite score 0-100
        risk_category (str): Risk category label
        annual_premium_euro (float): Current annual insurance premium in euros
        actual_value_euro (float): Estimated actual market value
        declared_value_euro (float): Value declared by the insured
        underinsured (bool): True if declared value is below actual value

    Returns:
        str: Ranked list of suggested actions with confidence levels in Greek
    """
    suggestions = []
    current_year = 2026
    building_age = current_year - year_built

    # Determine top risk factor from DB data
    top_risks = []
    zone_lower = str(earthquake_zone).lower()
    if "3" in zone_lower or "high" in zone_lower:
        top_risks.append(("seismic", 3))
    elif "2" in zone_lower or "medium" in zone_lower:
        top_risks.append(("seismic", 2))

    if fire_risk.lower() == "high" or near_nature:
        top_risks.append(("fire", 3 if fire_risk.lower() == "high" and near_nature else 2))

    if flood_zone.lower() in ("high", "medium"):
        top_risks.append(("flood", 3 if flood_zone.lower() == "high" else 2))

    if building_age > 50:
        top_risks.append(("age", 3))
    elif building_age > 30:
        top_risks.append(("age", 2))

    if nasa_avg_temp_c >= 22:
        top_risks.append(("climate", 2))

    top_risks.sort(key=lambda x: -x[1])
    top_risk_factor = top_risks[0][0] if top_risks else "general"

    # --- Premium adjustment ---
    if risk_score > 80:
        adj_pct = min(25, risk_score * 0.30)
        new_premium = annual_premium_euro * (1 + adj_pct / 100)
        suggestions.append({
            "priority": 1,
            "action": f"Αύξηση annual premium κατά {adj_pct:.0f}% (από €{annual_premium_euro:,.2f} → €{new_premium:,.2f})",
            "confidence": "Υψηλή",
            "rationale": f"Risk score {risk_score:.0f}/100 υπερβαίνει κρίσιμο threshold (80)"
        })
    elif risk_score > 65:
        adj_pct = min(15, risk_score * 0.18)
        new_premium = annual_premium_euro * (1 + adj_pct / 100)
        suggestions.append({
            "priority": 1,
            "action": f"Αύξηση annual premium κατά {adj_pct:.0f}% (από €{annual_premium_euro:,.2f} → €{new_premium:,.2f})",
            "confidence": "Υψηλή",
            "rationale": f"Risk score {risk_score:.0f}/100 — κατηγορία {risk_category}"
        })
    elif risk_score < 35:
        suggestions.append({
            "priority": 3,
            "action": "Διατήρηση τρέχοντος premium ή discount 5% για πιστή πελατεία",
            "confidence": "Μέτρια",
            "rationale": "Χαμηλό risk profile — κίνητρο για retention"
        })

    # --- Underinsurance ---
    if underinsured:
        gap = actual_value_euro - declared_value_euro
        suggestions.append({
            "priority": 1,
            "action": f"Επανεκτίμηση δηλωθείσας αξίας — έλλειμμα €{gap:,.0f} (δηλ. €{declared_value_euro:,.0f} vs πραγμ. €{actual_value_euro:,.0f})",
            "confidence": "Υψηλή",
            "rationale": "Υποασφάλιση εκθέτει τον ασφαλιστή σε μη καλυπτόμενες ζημίες"
        })

    # --- Material-based suggestions ---
    mat_lower = str(construction_material).lower()
    if "wood" in mat_lower:
        suggestions.append({
            "priority": 1,
            "action": "Απαίτηση fire-retardant επένδυσης ή αξιολόγηση άρνησης κάλυψης",
            "confidence": "Υψηλή",
            "rationale": "Ξύλινες κατασκευές: εξαιρετικά υψηλός κίνδυνος πυρκαγιάς"
        })
    elif "prefab" in mat_lower:
        suggestions.append({
            "priority": 2,
            "action": "Discount 8% αν γίνει σεισμική ενίσχυση (αντισεισμική μελέτη)",
            "confidence": "Μέτρια",
            "rationale": "Προκάτ κτίρια επωφελούνται από seismic retrofitting"
        })

    # --- Building age ---
    if building_age > 50:
        suggestions.append({
            "priority": 2,
            "action": f"Discount 10-15% αν γίνει αντισεισμική ανακαίνιση (κτίριο {building_age} ετών, {year_built})",
            "confidence": "Υψηλή",
            "rationale": "Κτίρια >50 ετών χτίστηκαν πριν τους σύγχρονους αντισεισμικούς κανονισμούς"
        })
    elif building_age > 30:
        suggestions.append({
            "priority": 3,
            "action": "Απαίτηση πιστοποιητικού ελέγχου στατικής επάρκειας",
            "confidence": "Μέτρια",
            "rationale": f"Κτίριο {building_age} ετών — χωρίς επιθεώρηση αυξάνεται η αβεβαιότητα"
        })

    # --- Wildland / fire proximity ---
    if near_nature:
        suggestions.append({
            "priority": 1,
            "action": "Discount 12% αν δημιουργηθεί αντιπυρική ζώνη 10μ γύρω από το κτίριο",
            "confidence": "Υψηλή",
            "rationale": "Firebreak αποδεδειγμένα μειώνει fire spread risk"
        })

    # --- Seismic-specific coverage ---
    if top_risk_factor == "seismic":
        suggestions.append({
            "priority": 2,
            "action": "Εξέταση earthquake-specific rider ή sublimit για seismic events",
            "confidence": "Μέτρια",
            "rationale": f"Ο σεισμικός κίνδυνος είναι ο κύριος driver ({earthquake_zone}) — απαιτεί dedicated coverage clause"
        })

    # --- High crime ---
    if crime_rate.lower() == "high":
        suggestions.append({
            "priority": 2,
            "action": "Discount 7% αν εγκατασταθεί πιστοποιημένο σύστημα συναγερμού + κάμερες",
            "confidence": "Μέτρια",
            "rationale": "Υψηλή εγκληματικότητα αυξάνει risk κλοπής/βανδαλισμού"
        })

    # Sort by priority
    suggestions.sort(key=lambda x: x["priority"])

    result = f"📋 ΠΡΟΤΑΣΕΙΣ ΔΡΑΣΗΣ — {external_id} | {region_name}\n"
    result += f"   {address}\n"
    result += "=" * 50 + "\n"
    result += f"Risk Score: {risk_score:.1f}/100 | Κατηγορία: {risk_category} | Κύριος κίνδυνος: {top_risk_factor}\n\n"

    for i, s in enumerate(suggestions, 1):
        icon = "✅" if s["confidence"] == "Υψηλή" else "⚡"
        result += f"{i}. {s['action']}\n"
        result += f"   {icon} Confidence: {s['confidence']}\n"
        result += f"   📌 Λόγος: {s['rationale']}\n\n"

    result += "─" * 50 + "\n"
    result += "⚠️  ΟΙ ΠΑΡΑΠΑΝΩ ΕΙΝΑΙ ΠΡΟΤΑΣΕΙΣ ΜΟΝΟ.\n"
    result += "    Η τελική απόφαση ανήκει αποκλειστικά στον Underwriter.\n"

    return result
