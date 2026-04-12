from ibm_watsonx_orchestrate.agent_builder.tools import tool


@tool
def interpret_building_data(
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
    """Interprets real building and environmental data from the EarthRisk database
    and produces a human-readable risk summary in Greek.

    All parameters come directly from the Building table in the database.
    Do NOT ask the user for any of these values — they are provided automatically.

    Args:
        external_id (str): Building ID, e.g. BLD_0290
        region_name (str): Greek prefecture / municipality name
        address (str): Full street address
        construction_material (str): concrete | wood | prefab
        year_built (int): Year the building was constructed
        earthquake_zone (str): Seismic zone — Zone 1 (low), Zone 2 (medium), Zone 3 (high)
        flood_zone (str): Flood exposure — none | low | medium | high
        fire_risk (str): Fire risk level — low | medium | high
        near_nature (bool): True if the building is near forest/wildland
        nasa_avg_temp_c (float): NASA-derived average temperature in Celsius
        crime_rate (str): Local crime rate — low | medium | high
        risk_score (float): EarthRisk composite score 0–100
        risk_category (str): Risk category label (e.g. High, Critical)
        annual_premium_euro (float): Current annual insurance premium in euros
        actual_value_euro (float): Estimated actual market value of the building
        declared_value_euro (float): Value declared by the insured
        underinsured (bool): True if declared value is below actual value

    Returns:
        str: Human-readable risk summary in Greek
    """
    warnings = []
    findings = []

    current_year = 2026
    building_age = current_year - year_built

    # --- Seismic risk ---
    zone_lower = str(earthquake_zone).lower()
    if "3" in zone_lower or "high" in zone_lower:
        warnings.append(f"🔴 Υψηλή σεισμική ζώνη ({earthquake_zone}) — αυξημένος κίνδυνος δομικής βλάβης")
    elif "2" in zone_lower or "medium" in zone_lower:
        findings.append(f"🟡 Μέτρια σεισμική ζώνη ({earthquake_zone})")
    else:
        findings.append(f"🟢 Χαμηλή σεισμική ζώνη ({earthquake_zone})")

    # --- Flood risk ---
    flood_lower = str(flood_zone).lower()
    if flood_lower == "high":
        warnings.append("🌊 Υψηλός κίνδυνος πλημμύρας — η περιοχή βρίσκεται σε πλημμυρική ζώνη")
    elif flood_lower == "medium":
        findings.append("🟡 Μέτρια πλημμυρική ζώνη")
    elif flood_lower == "low":
        findings.append("🟢 Χαμηλός κίνδυνος πλημμύρας")
    else:
        findings.append("🟢 Χωρίς πλημμυρική ζώνη")

    # --- Fire risk ---
    fire_lower = str(fire_risk).lower()
    if fire_lower == "high":
        warnings.append("🔥 Υψηλός κίνδυνος πυρκαγιάς για την περιοχή")
    elif fire_lower == "medium":
        findings.append("🟡 Μέτριος κίνδυνος πυρκαγιάς")
    else:
        findings.append("🟢 Χαμηλός κίνδυνος πυρκαγιάς")

    # --- Wildland proximity ---
    if near_nature:
        warnings.append("🌲 Κοντά σε δασική/φυσική έκταση — αυξημένος κίνδυνος αγροτικής πυρκαγιάς")

    # --- Construction material ---
    mat_lower = str(construction_material).lower()
    if "wood" in mat_lower or "ξύλ" in mat_lower:
        warnings.append("🪵 Ξύλινη κατασκευή — πολύ υψηλός κίνδυνος πυρκαγιάς")
    elif "prefab" in mat_lower or "προκάτ" in mat_lower:
        findings.append("🟡 Προκάτ κατασκευή — μέτρια αντοχή σε σεισμό")
    else:
        findings.append("🟢 Τσιμεντένια/λιθόκτιστη κατασκευή")

    # --- Building age ---
    if building_age > 50:
        warnings.append(f"🏚 Παλαιά κατασκευή ({building_age} ετών, {year_built}) — ενδέχεται να προηγείται των αντισεισμικών κανονισμών")
    elif building_age > 30:
        findings.append(f"🟡 Κτίριο {building_age} ετών ({year_built}) — συνιστάται επιθεώρηση")
    else:
        findings.append(f"🟢 Σχετικά νέα κατασκευή ({building_age} ετών)")

    # --- Temperature / climate ---
    if nasa_avg_temp_c >= 22:
        warnings.append(f"🌡 Υψηλή μέση θερμοκρασία ({nasa_avg_temp_c:.1f}°C) — αυξημένος κίνδυνος καύσωνα και πυρκαγιάς")
    elif nasa_avg_temp_c >= 18:
        findings.append(f"🟡 Μέτρια θερμοκρασία ({nasa_avg_temp_c:.1f}°C)")
    else:
        findings.append(f"🟢 Εύκρατο κλίμα ({nasa_avg_temp_c:.1f}°C)")

    # --- Crime rate ---
    crime_lower = str(crime_rate).lower()
    if crime_lower == "high":
        warnings.append("🚨 Υψηλή εγκληματικότητα περιοχής — αυξημένος κίνδυνος κλοπής/βανδαλισμού")
    elif crime_lower == "medium":
        findings.append("🟡 Μέτρια εγκληματικότητα")
    else:
        findings.append("🟢 Χαμηλή εγκληματικότητα")

    # --- Underinsurance ---
    if underinsured:
        gap = actual_value_euro - declared_value_euro
        warnings.append(
            f"⚠️ Υποασφάλιση: δηλωθείσα αξία €{declared_value_euro:,.0f} vs πραγματική €{actual_value_euro:,.0f} "
            f"(έλλειμμα €{gap:,.0f})"
        )
    else:
        findings.append(f"🟢 Επαρκής ασφαλιστική κάλυψη (δηλ. €{declared_value_euro:,.0f} / πραγμ. €{actual_value_euro:,.0f})")

    # --- Premium note ---
    findings.append(f"💰 Ετήσιο ασφάλιστρο: €{annual_premium_euro:,.2f}")

    # --- Compose output ---
    result = f"📍 ΑΝΑΛΥΣΗ ΚΤΙΡΙΟΥ: {external_id} — {region_name}\n"
    result += f"   {address}\n"
    result += f"   Σκορ ρίσκου: {risk_score:.1f}/100 ({risk_category})\n"
    result += "=" * 50 + "\n\n"

    if warnings:
        result += "⚠️ ΚΡΙΣΙΜΑ ΕΥΡΗΜΑΤΑ:\n"
        result += "\n".join(f"  {w}" for w in warnings)
        result += "\n\n"

    result += "📊 ΑΛΛΑ ΣΤΟΙΧΕΙΑ:\n"
    result += "\n".join(f"  {f}" for f in findings)
    result += "\n"

    return result
