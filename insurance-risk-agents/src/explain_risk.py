from ibm_watsonx_orchestrate.agent_builder.tools import tool


def _calculate_risk_score(
    earthquake_prob: float,
    volcano_prob: float,
    distance_to_fire_station_km: float,
    heat_days: int,
    rain_days: int,
    building_age_years: int,
    past_claims: int,
) -> tuple[float, dict]:
    """Core EarthRisk algorithm — mirrors preprocess.py formula exactly."""
    seismic_component = earthquake_prob * 0.30
    volcanic_component = volcano_prob * 0.10
    fire_access_component = (distance_to_fire_station_km / 45) * 100 * 0.20
    climate_component = min(100, (heat_days + rain_days) * 5) * 0.20
    age_component = building_age_years * 0.10
    claims_component = past_claims * 10

    total_score = (
        seismic_component
        + volcanic_component
        + fire_access_component
        + climate_component
        + age_component
        + claims_component
    )

    components = {
        "seismic": seismic_component,
        "volcanic": volcanic_component,
        "fire_access": fire_access_component,
        "climate": climate_component,
        "age": age_component,
        "claims": claims_component,
    }
    return total_score, components


@tool
def calculate_and_explain_risk(
    region_name: str,
    earthquake_prob: float,
    volcano_prob: float,
    distance_to_fire_station_km: float,
    heat_days: int,
    rain_days: int,
    building_age_years: int,
    past_claims: int,
    alert_threshold: float = 65.0,
) -> str:
    """Calculates the EarthRisk insurance risk score and explains each contributing factor.

    Uses the official EarthRisk weighted formula:
    Seismic(30%) + Volcanic(10%) + Fire Access(20%) + Climate(20%) + Age(10%) + Claims(10%)
    Thresholds: score > 65 = High Risk, score > 35 = Medium Risk, else Low Risk.

    Args:
        region_name (str): Name of the geographic region
        earthquake_prob (float): Seismic probability (0-100)
        volcano_prob (float): Volcanic risk score (0-100)
        distance_to_fire_station_km (float): Distance to fire station in km (0-45)
        heat_days (int): Days with temperature >= 36C
        rain_days (int): Days with heavy precipitation >= 20mm
        building_age_years (int): Building age in years
        past_claims (int): Number of past insurance claims (0-3)
        alert_threshold (float): Score above which an alert is triggered (default 65.0)

    Returns:
        str: Risk score, category, factor breakdown, and alert status in Greek
    """
    score, components = _calculate_risk_score(
        earthquake_prob,
        volcano_prob,
        distance_to_fire_station_km,
        heat_days,
        rain_days,
        building_age_years,
        past_claims,
    )

    if score > 65:
        category = "ΥΨΗΛΟΣ ΚΙΝΔΥΝΟΣ"
        category_icon = "🔴"
    elif score > 35:
        category = "ΜΕΤΡΙΟΣ ΚΙΝΔΥΝΟΣ"
        category_icon = "🟡"
    else:
        category = "ΧΑΜΗΛΟΣ ΚΙΝΔΥΝΟΣ"
        category_icon = "🟢"

    result = f"📊 ΑΞΙΟΛΟΓΗΣΗ ΚΙΝΔΥΝΟΥ — {region_name}\n"
    result += "=" * 45 + "\n\n"
    result += f"{category_icon} Κατηγορία: {category}\n"
    result += f"   Συνολικό Score: {score:.1f} / 100\n\n"

    result += "📋 ΑΝΑΛΥΣΗ ΑΝΑ ΠΑΡΑΓΟΝΤΑ:\n"

    factor_labels = {
        "seismic": ("Σεισμικός κίνδυνος", "30%", components["seismic"]),
        "volcanic": ("Ηφαιστειακός κίνδυνος", "10%", components["volcanic"]),
        "fire_access": ("Πρόσβαση πυρόσβεσης", "20%", components["fire_access"]),
        "climate": ("Κλιματική έκθεση", "20%", components["climate"]),
        "age": ("Ηλικία κτιρίου", "10%", components["age"]),
        "claims": ("Ιστορικό αποζημιώσεων", "10%", components["claims"]),
    }

    for key, (label, weight, value) in factor_labels.items():
        bar_filled = int((value / 30) * 10)
        bar = "█" * min(bar_filled, 10) + "░" * (10 - min(bar_filled, 10))
        result += f"  • {label} ({weight}): {value:.1f}  [{bar}]\n"

    # Identify top 2 drivers
    sorted_components = sorted(components.items(), key=lambda x: x[1], reverse=True)
    top_drivers = sorted_components[:2]

    driver_names = {
        "seismic": "σεισμικός κίνδυνος",
        "volcanic": "ηφαιστειακός κίνδυνος",
        "fire_access": "απόσταση πυροσβεστικής",
        "climate": "κλιματική έκθεση",
        "age": "ηλικία κτιρίου",
        "claims": "ιστορικό αποζημιώσεων",
    }

    result += f"\n💡 ΚΥΡΙΟΙ ΛΟΓΟΙ ΥΨΗΛΟΥ ΡΙΣΚΟΥ:\n"
    for driver_key, driver_value in top_drivers:
        if driver_value > 5:
            result += f"  → Ο {driver_names[driver_key]} συνεισφέρει {driver_value:.1f} μονάδες\n"

    # Alert trigger
    if score >= alert_threshold:
        result += f"\n🚨 ALERT ΕΝΕΡΓΟΠΟΙΗΘΗΚΕ (score {score:.1f} > threshold {alert_threshold:.0f})\n"
        result += "   → Ο Alerting Agent πρέπει να ειδοποιηθεί άμεσα.\n"

    return result
