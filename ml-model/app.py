"""
EarthRisk Flask Sidecar — ML Inference Server
Keeps all .pkl models loaded in memory. Express calls POST /predict
instead of spawning predict.py on every request.

Run: python app.py
Listens on: http://localhost:5001
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import shap
import os

# Import live enrichment helpers
from external_apis import get_elevation, get_earthquake_history, get_climate_data
from read_buildings import get_buildings

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

print("Loading EarthRisk ML models...")
fire_clf      = joblib.load(os.path.join(MODEL_DIR, 'model_fire_classifier.pkl'))
fire_reg      = joblib.load(os.path.join(MODEL_DIR, 'model_fire_regressor.pkl'))
flood_clf     = joblib.load(os.path.join(MODEL_DIR, 'model_flood_classifier.pkl'))
flood_reg     = joblib.load(os.path.join(MODEL_DIR, 'model_flood_regressor.pkl'))
eq_clf        = joblib.load(os.path.join(MODEL_DIR, 'model_earthquake_classifier.pkl'))
eq_reg        = joblib.load(os.path.join(MODEL_DIR, 'model_earthquake_regressor.pkl'))
premium_reg   = joblib.load(os.path.join(MODEL_DIR, 'model_premium_regressor.pkl'))
scaler        = joblib.load(os.path.join(MODEL_DIR, 'web_app_scaler.pkl'))
feature_names = joblib.load(os.path.join(MODEL_DIR, 'web_app_features_final.pkl'))
geo_mapper    = joblib.load(os.path.join(MODEL_DIR, 'web_app_geozone_mapper.pkl'))
shap_exp      = shap.TreeExplainer(premium_reg)
print(f"All models loaded. Expecting {len(feature_names)} features.")

NUMERIC_FEATURES = [
    '\u03a4\u03b5\u03c4\u03c1\u03b1\u03b3\u03c9\u03bd\u03b9\u03ba\u03ac_\u039c\u03ad\u03c4\u03c1\u03b1',
    '\u0397\u03bb\u03b9\u03ba\u03af\u03b1_\u039a\u03c4\u03b9\u03c1\u03af\u03bf\u03c5',
    '\u03a5\u03c8\u03cc\u03bc\u03b5\u03c4\u03c1\u03bf_\u039c\u03ad\u03c4\u03c1\u03b1',
    '\u0395\u03c4\u03ae\u03c3\u03b9\u03b1_\u0392\u03c1\u03bf\u03c7\u03cc\u03c0\u03c4\u03c9\u03c3\u03b7_mm',
    '\u039c\u03ad\u03c3\u03b7_\u0398\u03b5\u03c1\u03bc\u03bf\u03ba\u03c1\u03b1\u03c3\u03af\u03b1_\u039a\u03b1\u03bb\u03bf\u03ba\u03b1\u03b9\u03c1\u03b9\u03bf\u03cd_C',
    '\u0391\u03c0\u03cc\u03c3\u03c4\u03b1\u03c3\u03b7_\u03b1\u03c0\u03cc_\u03a0\u03c5\u03c1\u03bf\u03c3\u03b2\u03b5\u03c3\u03c4\u03b9\u03ba\u03ae_km',
    '\u0399\u03c3\u03c4\u03bf\u03c1\u03b9\u03ba\u03cc_\u03a3\u03b5\u03b9\u03c3\u03bc\u03ce\u03bd_50km',
    '\u0391\u03be\u03af\u03b1_\u0391\u03ba\u03b9\u03bd\u03ae\u03c4\u03bf\u03c5_\u0395\u03c5\u03c1\u03ce',
    '\u03a3\u03b5\u03b9\u03c3\u03bc\u03b9\u03ba\u03ae_\u0396\u03ce\u03bd\u03b7',
]

FEATURE_LABELS = {
    '\u03a4\u03b5\u03c4\u03c1\u03b1\u03b3\u03c9\u03bd\u03b9\u03ba\u03ac_\u039c\u03ad\u03c4\u03c1\u03b1':                  'Building Size',
    '\u0397\u03bb\u03b9\u03ba\u03af\u03b1_\u039a\u03c4\u03b9\u03c1\u03af\u03bf\u03c5':                      'Building Age',
    '\u03a5\u03c8\u03cc\u03bc\u03b5\u03c4\u03c1\u03bf_\u039c\u03ad\u03c4\u03c1\u03b1':                             'Elevation',
    '\u0395\u03c4\u03ae\u03c3\u03b9\u03b1_\u0392\u03c1\u03bf\u03c7\u03cc\u03c0\u03c4\u03c9\u03c3\u03b7_mm':               'Annual Rainfall',
    '\u039c\u03ad\u03c3\u03b7_\u0398\u03b5\u03c1\u03bc\u03bf\u03ba\u03c1\u03b1\u03c3\u03af\u03b1_\u039a\u03b1\u03bb\u03bf\u03ba\u03b1\u03b9\u03c1\u03b9\u03bf\u03cd_C':     'Summer Temperature',
    '\u0391\u03c0\u03cc\u03c3\u03c4\u03b1\u03c3\u03b7_\u03b1\u03c0\u03cc_\u03a0\u03c5\u03c1\u03bf\u03c3\u03b2\u03b5\u03c3\u03c4\u03b9\u03ba\u03ae_km':       'Distance to Fire Station',
    '\u0399\u03c3\u03c4\u03bf\u03c1\u03b9\u03ba\u03cc_\u03a3\u03b5\u03b9\u03c3\u03bc\u03ce\u03bd_50km':              'Seismic Activity (50km)',
    '\u0391\u03be\u03af\u03b1_\u0391\u03ba\u03b9\u03bd\u03ae\u03c4\u03bf\u03c5_\u0395\u03c5\u03c1\u03ce':                 'Property Value (\u20ac)',
    '\u03a3\u03b5\u03b9\u03c3\u03bc\u03b9\u03ba\u03ae_\u0396\u03ce\u03bd\u03b7':                      'Seismic Zone',
    '\u039a\u03bf\u03bd\u03c4\u03ac_\u03c3\u03b5_\u0394\u03ac\u03c3\u03bf\u03c2':                             'Near Wildland',
    '\u0391\u03bd\u03c4\u03b9\u03c0\u03bb\u03b7\u03bc\u03bc\u03c5\u03c1\u03b9\u03ba\u03ac_\u0395\u03bc\u03c0\u03cc\u03b4\u03b9\u03b1':            'Flood Barriers',
    '\u0391\u03bd\u03c4\u03b9\u03c3\u03b5\u03b9\u03c3\u03bc\u03b9\u03ba\u03ae_\u0395\u03bd\u03af\u03c3\u03c7\u03c5\u03c3\u03b7':             'Seismic Retrofit',
    '\u0391\u03b5\u03c1\u03b1\u03b3\u03c9\u03b3\u03bf\u03af_\u0391\u03bd\u03c4\u03b9\u03c0\u03c5\u03c1\u03b9\u03ba\u03bf\u03af':            'Ember Vents',
    '\u03a5\u03bb\u03b9\u03ba\u03cc_\u039a\u03b1\u03c4\u03b1\u03c3\u03ba\u03b5\u03c5\u03ae\u03c2_\u039e\u03cd\u03bb\u03b9\u03bd\u03bf':          'Wooden Construction',
    '\u03a5\u03bb\u03b9\u03ba\u03cc_\u039a\u03b1\u03c4\u03b1\u03c3\u03ba\u03b5\u03c5\u03ae\u03c2_\u03a0\u03ad\u03c4\u03c1\u03b1':           'Stone Construction',
    '\u03a5\u03bb\u03b9\u03ba\u03cc_\u039a\u03b1\u03c4\u03b1\u03c3\u03ba\u03b5\u03c5\u03ae\u03c2_\u03a0\u03ac\u03bd\u03b5\u03bb':           'Panel Construction',
    '\u03a4\u03cd\u03c0\u03bf\u03c2_\u0391\u03ba\u03b9\u03bd\u03ae\u03c4\u03bf\u03c5_\u039c\u03bf\u03bd\u03bf\u03ba\u03b1\u03c4\u03bf\u03b9\u03ba\u03af\u03b1':      'Single House',
    '\u03a4\u03cd\u03c0\u03bf\u03c2_\u03a3\u03ba\u03b5\u03c0\u03ae\u03c2_\u03a4\u03b1\u03c1\u03ac\u03c4\u03c3\u03b1':             'Flat Roof',
}


def zone_to_int(zone):
    return {'none': 0, 'low': 1, 'medium': 2, 'high': 3}.get(str(zone).lower(), 1)


def map_material(mat):
    mat = str(mat).lower()
    if any(k in mat for k in ('wood', 'wooden', 'timber', '\u03be\u03cd\u03bb')):
        return '\u039e\u03cd\u03bb\u03b9\u03bd\u03bf'
    if any(k in mat for k in ('stone', '\u03c0\u03ad\u03c4\u03c1')):
        return '\u03a0\u03ad\u03c4\u03c1\u03b1'
    if any(k in mat for k in ('panel', '\u03c0\u03ac\u03bd\u03b5\u03bb')):
        return '\u03a0\u03ac\u03bd\u03b5\u03bb'
    return '\u039c\u03c0\u03b5\u03c4\u03cc\u03bd/\u03a4\u03bf\u03cd\u03b2\u03bb\u03bf'


def map_type(btype):
    btype = str(btype).lower()
    if any(k in btype for k in ('house', 'villa', 'residential', 'detached', '\u03bc\u03bf\u03bd\u03bf\u03ba\u03b1\u03c4')):
        return '\u039c\u03bf\u03bd\u03bf\u03ba\u03b1\u03c4\u03bf\u03b9\u03ba\u03af\u03b1'
    return '\u0394\u03b9\u03b1\u03bc\u03ad\u03c1\u03b9\u03c3\u03bc\u03b1'


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'models_loaded': 7})


_buildings_cache = None

@app.route('/buildings', methods=['GET'])
def buildings():
    global _buildings_cache
    if _buildings_cache is None:
        _buildings_cache = get_buildings()
    return jsonify(_buildings_cache)


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True) or {}

    lat = float(data.get('latitude') or 38.0)
    lon = float(data.get('longitude') or 23.7)

    # --- Live API enrichment (with fallbacks) ---
    enriched = False
    try:
        elev = get_elevation(lat, lon)
        if elev is not None:
            data['elevation_m'] = elev
            enriched = True
    except Exception:
        pass

    try:
        climate = get_climate_data(lat, lon)
        if climate:
            data['annual_rainfall_mm'] = climate.get('annual_rainfall_mm', data.get('annual_rainfall_mm', 500.0))
            data['nasa_avg_temp_c']    = climate.get('avg_summer_temp_C',   data.get('nasa_avg_temp_c', 28.0))
            enriched = True
    except Exception:
        pass

    try:
        quakes = get_earthquake_history(lat, lon)
        if quakes is not None:
            data['historical_earthquakes_50km'] = quakes
            enriched = True
    except Exception:
        pass

    # --- Feature engineering ---
    year_built   = int(data.get('year_built') or 1985)
    building_age = max(0, 2026 - year_built)
    geo_zone     = int(geo_mapper.predict([[lat, lon]])[0])
    material     = map_material(data.get('construction_material') or 'concrete')
    prop_type    = map_type(data.get('building_type') or 'residential')
    flood_zone   = str(data.get('flood_zone') or 'none').lower()
    eq_zone      = str(data.get('earthquake_zone') or 'medium').lower()

    raw = {
        NUMERIC_FEATURES[0]: float(data.get('area_sqm') or 100),
        NUMERIC_FEATURES[1]: building_age,
        NUMERIC_FEATURES[2]: float(data.get('elevation_m') or 50),
        NUMERIC_FEATURES[3]: float(data.get('annual_rainfall_mm') or 500),
        NUMERIC_FEATURES[4]: float(data.get('nasa_avg_temp_c') or 28),
        NUMERIC_FEATURES[5]: float(data.get('dist_to_fire_station_km') or 5.0),
        NUMERIC_FEATURES[6]: float(data.get('historical_earthquakes_50km') or 50),
        NUMERIC_FEATURES[7]: float(data.get('actual_value_euro') or 150000),
        NUMERIC_FEATURES[8]: zone_to_int(eq_zone),
        '\u03a5\u03c0\u03cc\u03b3\u03b5\u03b9\u03bf':                               0,
        '\u039a\u03bf\u03bd\u03c4\u03ac_\u03c3\u03b5_\u0394\u03ac\u03c3\u03bf\u03c2':                        int(bool(data.get('near_nature'))),
        '\u039a\u03bf\u03bd\u03c4\u03ac_\u03c3\u03b5_\u0395\u03c0\u03b9\u03ba\u03af\u03bd\u03b4\u03c5\u03bd\u03b5\u03c2_\u0395\u03b3\u03ba\u03b1\u03c4\u03b1\u03c3\u03c4\u03ac\u03c3\u03b5\u03b9\u03c2':   0,
        '\u0395\u03be\u03c9\u03c4\u03b5\u03c1\u03b9\u03ba\u03bf\u03af_\u03a0\u03c5\u03c1\u03bf\u03c3\u03b2\u03b5\u03c3\u03c4\u03ae\u03c1\u03b5\u03c2':             0,
        '\u0391\u03b5\u03c1\u03b1\u03b3\u03c9\u03b3\u03bf\u03af_\u0391\u03bd\u03c4\u03b9\u03c0\u03c5\u03c1\u03b9\u03ba\u03bf\u03af':                0,
        '\u0391\u03bd\u03c4\u03b9\u03c0\u03bb\u03b7\u03bc\u03bc\u03c5\u03c1\u03b9\u03ba\u03ac_\u0395\u03bc\u03c0\u03cc\u03b4\u03b9\u03b1':               1 if flood_zone in ('high', 'medium') else 0,
        '\u0391\u03bd\u03c4\u03bb\u03af\u03b1_\u03a5\u03b4\u03ac\u03c4\u03c9\u03bd':                         0,
        '\u0391\u03bd\u03c4\u03b9\u03c3\u03b5\u03b9\u03c3\u03bc\u03b9\u03ba\u03ae_\u0395\u03bd\u03af\u03c3\u03c7\u03c5\u03c3\u03b7':                1 if year_built < 1990 and eq_zone in ('high', 'medium') else 0,
        '\u0392\u03b1\u03bb\u03b2\u03af\u03b4\u03b1_\u0391\u03b5\u03c1\u03af\u03bf\u03c5':                        0,
        '\u03a4\u03cd\u03c0\u03bf\u03c2_\u0391\u03ba\u03b9\u03bd\u03ae\u03c4\u03bf\u03c5_\u039c\u03bf\u03bd\u03bf\u03ba\u03b1\u03c4\u03bf\u03b9\u03ba\u03af\u03b1':          1 if prop_type == '\u039c\u03bf\u03bd\u03bf\u03ba\u03b1\u03c4\u03bf\u03b9\u03ba\u03af\u03b1' else 0,
        '\u03a5\u03bb\u03b9\u03ba\u03cc_\u039a\u03b1\u03c4\u03b1\u03c3\u03ba\u03b5\u03c5\u03ae\u03c2_\u039e\u03cd\u03bb\u03b9\u03bd\u03bf':              1 if material == '\u039e\u03cd\u03bb\u03b9\u03bd\u03bf' else 0,
        '\u03a5\u03bb\u03b9\u03ba\u03cc_\u039a\u03b1\u03c4\u03b1\u03c3\u03ba\u03b5\u03c5\u03ae\u03c2_\u03a0\u03ac\u03bd\u03b5\u03bb':               1 if material == '\u03a0\u03ac\u03bd\u03b5\u03bb' else 0,
        '\u03a5\u03bb\u03b9\u03ba\u03cc_\u039a\u03b1\u03c4\u03b1\u03c3\u03ba\u03b5\u03c5\u03ae\u03c2_\u03a0\u03ad\u03c4\u03c1\u03b1':               1 if material == '\u03a0\u03ad\u03c4\u03c1\u03b1' else 0,
        '\u03a4\u03cd\u03c0\u03bf\u03c2_\u03a3\u03ba\u03b5\u03c0\u03ae\u03c2_\u03a4\u03b1\u03c1\u03ac\u03c4\u03c3\u03b1':                 1,
        '\u0393\u03b5\u03c9\u03b3\u03c1\u03b1\u03c6\u03b9\u03ba\u03ae_\u0396\u03ce\u03bd\u03b7_1':                    1 if geo_zone == 1 else 0,
        '\u0393\u03b5\u03c9\u03b3\u03c1\u03b1\u03c6\u03b9\u03ba\u03ae_\u0396\u03ce\u03bd\u03b7_2':                    1 if geo_zone == 2 else 0,
        '\u0393\u03b5\u03c9\u03b3\u03c1\u03b1\u03c6\u03b9\u03ba\u03ae_\u0396\u03ce\u03bd\u03b7_3':                    1 if geo_zone == 3 else 0,
    }

    df = pd.DataFrame([{f: raw.get(f, 0) for f in feature_names}])
    df[NUMERIC_FEATURES] = scaler.transform(df[NUMERIC_FEATURES])
    X = df[feature_names].values

    # --- Two-stage predictions ---
    fire_prob  = float(fire_clf.predict_proba(X)[0][1])
    flood_prob = float(flood_clf.predict_proba(X)[0][1])
    eq_prob    = float(eq_clf.predict_proba(X)[0][1])

    fire_amount  = float(fire_reg.predict(X)[0])  * fire_prob
    flood_amount = float(flood_reg.predict(X)[0]) * flood_prob
    eq_amount    = float(eq_reg.predict(X)[0])    * eq_prob

    premium = float(premium_reg.predict(X)[0])

    # --- SHAP top factors ---
    shap_vals = shap_exp.shap_values(X)[0]
    top_factors = sorted(
        zip(feature_names, shap_vals),
        key=lambda t: abs(t[1]),
        reverse=True
    )[:5]

    return jsonify({
        'fire_claim_probability':        round(fire_prob, 3),
        'fire_expected_claim_eur':       round(fire_amount, 2),
        'flood_claim_probability':       round(flood_prob, 3),
        'flood_expected_claim_eur':      round(flood_amount, 2),
        'earthquake_claim_probability':  round(eq_prob, 3),
        'earthquake_expected_claim_eur': round(eq_amount, 2),
        'predicted_premium_eur':         round(premium, 2),
        'shap_top_factors': [
            {
                'feature':   FEATURE_LABELS.get(f, f),
                'impact':    round(float(v), 4),
                'direction': 'increases' if v > 0 else 'decreases'
            }
            for f, v in top_factors
        ],
        'enriched_with_live_apis': enriched,
    })


if __name__ == '__main__':
    print("EarthRisk Sidecar running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=False)
