"""
EarthRisk ML Predictor — CLI script (no server needed)
Called by the Express backend via child_process.
Reads building JSON from stdin, writes prediction JSON to stdout.

Usage: python predict.py < building.json
"""
import sys
import json
import os

import joblib
import numpy as np
import pandas as pd

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

fire_clf      = joblib.load(os.path.join(MODEL_DIR, 'model_fire_classifier.pkl'))
fire_reg      = joblib.load(os.path.join(MODEL_DIR, 'model_fire_regressor.pkl'))
flood_clf     = joblib.load(os.path.join(MODEL_DIR, 'model_flood_classifier.pkl'))
flood_reg     = joblib.load(os.path.join(MODEL_DIR, 'model_flood_regressor.pkl'))
eq_clf        = joblib.load(os.path.join(MODEL_DIR, 'model_earthquake_classifier.pkl'))
eq_reg        = joblib.load(os.path.join(MODEL_DIR, 'model_earthquake_regressor.pkl'))
premium_reg   = joblib.load(os.path.join(MODEL_DIR, 'model_premium_regressor.pkl'))
shap_exp      = joblib.load(os.path.join(MODEL_DIR, 'shap_explainer_premium.pkl'))
scaler        = joblib.load(os.path.join(MODEL_DIR, 'web_app_scaler.pkl'))
feature_names = joblib.load(os.path.join(MODEL_DIR, 'web_app_features_final.pkl'))
geo_mapper    = joblib.load(os.path.join(MODEL_DIR, 'web_app_geozone_mapper.pkl'))

# Must match the order the scaler was fitted on
NUMERIC_FEATURES = [
    'Τετραγωνικά_Μέτρα',
    'Ηλικία_Κτιρίου',
    'Υψόμετρο_Μέτρα',
    'Ετήσια_Βροχόπτωση_mm',
    'Μέση_Θερμοκρασία_Καλοκαιριού_C',
    'Απόσταση_από_Πυροσβεστική_km',
    'Ιστορικό_Σεισμών_50km',
    'Αξία_Ακινήτου_Ευρώ',
    'Σεισμική_Ζώνη',
]

FEATURE_LABELS = {
    'Τετραγωνικά_Μέτρα':                         'Building Size',
    'Ηλικία_Κτιρίου':                             'Building Age',
    'Υψόμετρο_Μέτρα':                             'Elevation',
    'Ετήσια_Βροχόπτωση_mm':                       'Annual Rainfall',
    'Μέση_Θερμοκρασία_Καλοκαιριού_C':             'Summer Temperature',
    'Απόσταση_από_Πυροσβεστική_km':               'Distance to Fire Station',
    'Ιστορικό_Σεισμών_50km':                      'Seismic Activity (50km)',
    'Αξία_Ακινήτου_Ευρώ':                         'Property Value (€)',
    'Σεισμική_Ζώνη':                              'Seismic Zone',
    'Κοντά_σε_Δάσος':                             'Near Wildland',
    'Αντιπλημμυρικά_Εμπόδια':                     'Flood Barriers',
    'Αντισεισμική_Ενίσχυση':                      'Seismic Retrofit',
    'Αεραγωγοί_Αντιπυρικοί':                      'Ember Vents',
    'Υλικό_Κατασκευής_Ξύλινο':                    'Wooden Construction',
    'Υλικό_Κατασκευής_Πέτρα':                     'Stone Construction',
    'Υλικό_Κατασκευής_Πάνελ':                     'Panel Construction',
    'Τύπος_Ακινήτου_Μονοκατοικία':                'Single House',
    'Τύπος_Σκεπής_Ταράτσα':                       'Flat Roof',
}


def zone_to_int(zone):
    return {'none': 0, 'low': 1, 'medium': 2, 'high': 3}.get(str(zone).lower(), 1)


def map_material(mat):
    mat = str(mat).lower()
    if any(k in mat for k in ('wood', 'wooden', 'timber')):
        return 'Ξύλινο'
    if 'stone' in mat:
        return 'Πέτρα'
    if 'panel' in mat:
        return 'Πάνελ'
    return 'Μπετόν/Τούβλο'


def map_type(btype):
    btype = str(btype).lower()
    if any(k in btype for k in ('house', 'villa', 'residential', 'detached')):
        return 'Μονοκατοικία'
    return 'Διαμέρισμα'


data = json.loads(sys.stdin.read())

year_built   = int(data.get('year_built') or 1985)
building_age = max(0, 2026 - year_built)
lat          = float(data.get('latitude') or 38.0)
lon          = float(data.get('longitude') or 23.7)
geo_zone     = int(geo_mapper.predict([[lat, lon]])[0])
material     = map_material(data.get('construction_material') or 'concrete')
prop_type    = map_type(data.get('building_type') or 'residential')
flood_zone   = str(data.get('flood_zone') or 'none').lower()
eq_zone      = str(data.get('earthquake_zone') or 'medium').lower()

raw = {
    'Τετραγωνικά_Μέτρα':                    float(data.get('area_sqm') or 100),
    'Ηλικία_Κτιρίου':                        building_age,
    'Υψόμετρο_Μέτρα':                        float(data.get('elevation_m') or 50),
    'Ετήσια_Βροχόπτωση_mm':                  float(data.get('annual_rainfall_mm') or 500),
    'Μέση_Θερμοκρασία_Καλοκαιριού_C':        float(data.get('nasa_avg_temp_c') or 28),
    'Απόσταση_από_Πυροσβεστική_km':          float(data.get('dist_to_fire_station_km') or 5.0),
    'Ιστορικό_Σεισμών_50km':                 float(data.get('historical_earthquakes_50km') or 50),
    'Αξία_Ακινήτου_Ευρώ':                    float(data.get('actual_value_euro') or 150000),
    'Σεισμική_Ζώνη':                         zone_to_int(eq_zone),
    'Υπόγειο':                               0,
    'Κοντά_σε_Δάσος':                        int(bool(data.get('near_nature'))),
    'Κοντά_σε_Επικίνδυνες_Εγκαταστάσεις':   0,
    'Εξωτερικοί_Πυροσβεστήρες':             0,
    'Αεραγωγοί_Αντιπυρικοί':                0,
    'Αντιπλημμυρικά_Εμπόδια':               1 if flood_zone in ('high', 'medium') else 0,
    'Αντλία_Υδάτων':                         0,
    'Αντισεισμική_Ενίσχυση':                1 if year_built < 1990 and eq_zone in ('high', 'medium') else 0,
    'Βαλβίδα_Αερίου':                        0,
    'Τύπος_Ακινήτου_Μονοκατοικία':          1 if prop_type == 'Μονοκατοικία' else 0,
    'Υλικό_Κατασκευής_Ξύλινο':              1 if material == 'Ξύλινο' else 0,
    'Υλικό_Κατασκευής_Πάνελ':               1 if material == 'Πάνελ' else 0,
    'Υλικό_Κατασκευής_Πέτρα':               1 if material == 'Πέτρα' else 0,
    'Τύπος_Σκεπής_Ταράτσα':                 1,
    'Γεωγραφική_Ζώνη_1':                    1 if geo_zone == 1 else 0,
    'Γεωγραφική_Ζώνη_2':                    1 if geo_zone == 2 else 0,
    'Γεωγραφική_Ζώνη_3':                    1 if geo_zone == 3 else 0,
}

df = pd.DataFrame([{f: raw.get(f, 0) for f in feature_names}])
df[NUMERIC_FEATURES] = scaler.transform(df[NUMERIC_FEATURES])
X = df[feature_names].values

fire_prob  = float(fire_clf.predict_proba(X)[0][1])
flood_prob = float(flood_clf.predict_proba(X)[0][1])
eq_prob    = float(eq_clf.predict_proba(X)[0][1])

fire_amount  = float(fire_reg.predict(X)[0])  * fire_prob
flood_amount = float(flood_reg.predict(X)[0]) * flood_prob
eq_amount    = float(eq_reg.predict(X)[0])    * eq_prob

premium = float(premium_reg.predict(X)[0])

shap_vals   = shap_exp.shap_values(X)[0]
top_factors = sorted(zip(feature_names, shap_vals), key=lambda t: abs(t[1]), reverse=True)[:5]

result = {
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
    ]
}

print(json.dumps(result))
