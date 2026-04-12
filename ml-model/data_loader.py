import pandas as pd
import numpy as np
import external_apis
import time
import os
import io
import ibm_boto3
from ibm_botocore.client import Config

# -------------------------------------------------------------------
# 0. ΡΥΘΜΙΣΕΙΣ & ΠΡΟΕΤΟΙΜΑΣΙΑ
# -------------------------------------------------------------------
np.random.seed(42)
n_records = 1000

print(f"Εκκίνηση Data Generation για {n_records} ακίνητα...")

# STREET POOLS ΜΕ ΟΡΙΑ (Για να μην πέφτουν στη θάλασσα) & BASE PRICE
prefectures_data = {
    'Αττικής': {
        'coords': (38.00, 23.73), 'seismic_zone': 2, 'base_price': 2800,
        'lat_noise': (-0.02, 0.02), 'lon_noise': (-0.02, 0.02),
        'streets': ['Λεωφόρος Κηφισίας', 'Πατησίων', 'Λεωφόρος Συγγρού', 'Αλεξάνδρας', 'Βασιλίσσης Σοφίας']
    },
    'Θεσσαλονίκης': {
        'coords': (40.63, 22.94), 'seismic_zone': 2, 'base_price': 2200,
        'lat_noise': (0.00, 0.03), 'lon_noise': (0.00, 0.03),
        'streets': ['Τσιμισκή', 'Εγνατία', 'Λεωφόρος Νίκης', 'Βασιλίσσης Όλγας', 'Μοναστηρίου']
    },
    'Αχαΐας': {
        'coords': (38.24, 21.73), 'seismic_zone': 3, 'base_price': 1500,
        'lat_noise': (-0.03, 0.00), 'lon_noise': (0.00, 0.03),
        'streets': ['Αγίου Ανδρέου', 'Κορίνθου', 'Μαιζώνος', 'Γούναρη', 'Κανακάρη']
    },
    'Ηρακλείου': {
        'coords': (35.33, 25.14), 'seismic_zone': 3, 'base_price': 1800,
        'lat_noise': (-0.03, 0.00), 'lon_noise': (-0.02, 0.02),
        'streets': ['Δικαιοσύνης', 'Καλοκαιρινού', 'Κνωσού', 'Ικάρου', '62 Μαρτύρων']
    },
    'Λάρισας': {
        'coords': (39.63, 22.41), 'seismic_zone': 1, 'base_price': 1300,
        'lat_noise': (-0.03, 0.03), 'lon_noise': (-0.03, 0.03),
        'streets': ['Κύπρου', 'Βενιζέλου', 'Παπαναστασίου', 'Ηρώων Πολυτεχνείου', 'Μανδηλαρά']
    }
}

print("\n🌐 Άντληση ΠΡΑΓΜΑΤΙΚΩΝ Δεδομένων από τα Open APIs...")
for pref, data in prefectures_data.items():
    lat, lon = data['coords']
    print(f"  -> Φόρτωση κλίματος και γεωλογίας για: {pref}...")

    data['real_elev'] = external_apis.get_elevation(lat, lon)
    climate = external_apis.get_climate_data(lat, lon)
    data['real_rain'] = climate['annual_rainfall_mm']
    data['real_temp'] = climate['avg_summer_temp_C']
    data['real_quakes'] = external_apis.get_earthquake_history(lat, lon)
    time.sleep(0.5)
print("✅ Η άντληση ολοκληρώθηκε!\n")

prefs = list(prefectures_data.keys())

# -------------------------------------------------------------------
# 1 & 2. ΤΑΥΤΟΤΗΤΑ & ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ (Εσωτερικές Στήλες)
# -------------------------------------------------------------------
df = pd.DataFrame({'building_id': [f"BLD_{str(i).zfill(6)}" for i in range(1, n_records + 1)]})

df['prefecture'] = np.random.choice(prefs, size=n_records)
df['address'] = df['prefecture'].apply(lambda p: f"{np.random.choice(prefectures_data[p]['streets'])} {np.random.randint(1, 150)}")

lat_list, lon_list = [], []
for pref in df['prefecture']:
    lat_base, lon_base = prefectures_data[pref]['coords']
    lat_n_min, lat_n_max = prefectures_data[pref]['lat_noise']
    lon_n_min, lon_n_max = prefectures_data[pref]['lon_noise']
    lat_list.append(lat_base + np.random.uniform(lat_n_min, lat_n_max))
    lon_list.append(lon_base + np.random.uniform(lon_n_min, lon_n_max))

df['latitude'] = lat_list
df['longitude'] = lon_list
df['sq_meters'] = np.random.randint(40, 350, n_records)
df['build_year'] = np.random.randint(1950, 2025, n_records)
df['property_type'] = np.random.choice(['Διαμέρισμα', 'Μονοκατοικία'], size=n_records)
df['construction_material'] = np.random.choice(['Μπετόν/Τούβλο', 'Πέτρα', 'Ξύλινο', 'Πάνελ'], p=[0.7, 0.15, 0.1, 0.05], size=n_records)
df['has_basement'] = np.random.choice([True, False], size=n_records)
df['roof_type'] = np.random.choice(['Ταράτσα', 'Κεραμοσκεπή'], size=n_records)

df['elevation_meters'] = df['prefecture'].map(lambda p: prefectures_data[p]['real_elev']) + np.random.uniform(-15, 15, n_records)
df['elevation_meters'] = df['elevation_meters'].clip(lower=2).round(1)
df['annual_rainfall_mm'] = df['prefecture'].map(lambda p: prefectures_data[p]['real_rain']) + np.random.uniform(-30, 30, n_records)
df['avg_summer_temp_C'] = df['prefecture'].map(lambda p: prefectures_data[p]['real_temp']) + np.random.uniform(-1.5, 1.5, n_records)
df['historical_earthquakes_50km'] = df['prefecture'].map(lambda p: prefectures_data[p]['real_quakes'])
df['seismic_zone'] = df['prefecture'].map(lambda p: prefectures_data[p]['seismic_zone'])
df['near_forest'] = np.random.choice([True, False], p=[0.2, 0.8], size=n_records)
df['dist_to_fire_station_km'] = np.random.uniform(0.5, 30.0, n_records).round(1)
df['near_hazardous_poi'] = np.random.choice([True, False], p=[0.1, 0.9], size=n_records)

df['has_exterior_sprinklers'] = np.random.choice([True, False], p=[0.05, 0.95], size=n_records)
df['has_ember_vents'] = np.random.choice([True, False], p=[0.1, 0.9], size=n_records)
df['has_flood_barriers'] = np.random.choice([True, False], p=[0.08, 0.92], size=n_records)
df['has_sump_pump'] = np.where(df['has_basement'], np.random.choice([True, False], p=[0.2, 0.8], size=n_records), False)
df['has_seismic_retrofit'] = np.where(df['build_year'] < 1990, np.random.choice([True, False], p=[0.15, 0.85], size=n_records), False)
df['has_gas_valve'] = np.random.choice([True, False], p=[0.12, 0.88], size=n_records)

print("Υπολογισμός Αξίας Ακινήτων...")
df['base_price_sqm'] = df['prefecture'].map(lambda p: prefectures_data[p]['base_price'])
df['age_depreciation'] = (1 - ((2026 - df['build_year']) * 0.01)).clip(lower=0.5)
mat_mult = {'Μπετόν/Τούβλο': 1.0, 'Πέτρα': 1.2, 'Ξύλινο': 0.85, 'Πάνελ': 0.7}
df['mat_mult'] = df['construction_material'].map(mat_mult)
df['property_value_euro'] = (df['sq_meters'] * df['base_price_sqm'] * df['age_depreciation'] * df['mat_mult']).round(2)
df.drop(columns=['base_price_sqm', 'age_depreciation', 'mat_mult'], inplace=True)

print("Υπολογισμός Ιστορικών Ζημιών...")
fire_prob = np.full(n_records, 0.02)
fire_prob += np.where(df['near_forest'], 0.15, 0)
fire_prob += np.where(df['avg_summer_temp_C'] > 35, 0.05, 0)
fire_prob += np.where(df['construction_material'] == 'Ξύλινο', 0.10, 0)
fire_prob = np.where(df['has_ember_vents'], fire_prob * 0.4, fire_prob)
fire_sev = (df['property_value_euro'] * 0.15) + (df['dist_to_fire_station_km'] * 2000)
fire_sev = np.where(df['has_exterior_sprinklers'], fire_sev * 0.15, fire_sev)
df['historical_fire_claim_euro'] = np.where(np.random.rand(n_records) < fire_prob, fire_sev * np.random.uniform(0.8, 1.2, n_records), 0).round(2)

flood_prob = np.full(n_records, 0.03)
flood_prob += np.where(df['elevation_meters'] < 20, 0.12, 0)
flood_prob += np.where(df['annual_rainfall_mm'] > 600, 0.08, 0)
flood_prob = np.where(df['has_flood_barriers'], flood_prob * 0.2, flood_prob)
flood_sev = (df['property_value_euro'] * 0.10) + np.where(df['has_basement'], 25000, 0)
flood_sev = np.where(df['has_sump_pump'], flood_sev * 0.3, flood_sev)
df['historical_flood_claim_euro'] = np.where(np.random.rand(n_records) < flood_prob, flood_sev * np.random.uniform(0.8, 1.2, n_records), 0).round(2)

eq_prob = df['seismic_zone'] * 0.03
eq_prob += np.where(df['historical_earthquakes_50km'] > 100, 0.05, 0)
eq_prob += np.where(df['build_year'] < 1990, 0.08, 0)
eq_prob += np.where(df['construction_material'] == 'Πέτρα', 0.05, 0)
eq_sev = (df['property_value_euro'] * 0.25)
eq_sev = np.where(df['has_seismic_retrofit'], eq_sev * 0.1, eq_sev)
eq_sev = np.where(df['has_gas_valve'], eq_sev - 15000, eq_sev)
df['historical_earthquake_claim_euro'] = np.where(np.random.rand(n_records) < eq_prob, np.maximum(0, eq_sev * np.random.uniform(0.8, 1.2, n_records)), 0).round(2)

base_premium = (df['property_value_euro'] * 0.0015) + (df['seismic_zone'] * 40)
df['historical_annual_premium'] = (base_premium * np.random.uniform(0.9, 1.1, n_records)).round(2)

# -------------------------------------------------------------------
# 🇬🇷 ΜΕΤΑΦΡΑΣΗ ΣΤΗΛΩΝ ΣΤΑ ΕΛΛΗΝΙΚΑ ΠΡΙΝ ΤΗΝ ΑΠΟΘΗΚΕΥΣΗ
# -------------------------------------------------------------------
print("🇬🇷 Μετάφραση στηλών στα Ελληνικά...")
greek_columns = {
    'building_id': 'Κωδικός_Ακινήτου', 'prefecture': 'Νομός', 'address': 'Διεύθυνση',
    'latitude': 'Γεωγραφικό_Πλάτος', 'longitude': 'Γεωγραφικό_Μήκος', 'sq_meters': 'Τετραγωνικά_Μέτρα',
    'build_year': 'Έτος_Κατασκευής', 'property_type': 'Τύπος_Ακινήτου', 'construction_material': 'Υλικό_Κατασκευής',
    'has_basement': 'Υπόγειο', 'roof_type': 'Τύπος_Σκεπής', 'elevation_meters': 'Υψόμετρο_Μέτρα',
    'annual_rainfall_mm': 'Ετήσια_Βροχόπτωση_mm', 'avg_summer_temp_C': 'Μέση_Θερμοκρασία_Καλοκαιριού_C',
    'historical_earthquakes_50km': 'Ιστορικό_Σεισμών_50km', 'seismic_zone': 'Σεισμική_Ζώνη',
    'near_forest': 'Κοντά_σε_Δάσος', 'dist_to_fire_station_km': 'Απόσταση_από_Πυροσβεστική_km',
    'near_hazardous_poi': 'Κοντά_σε_Επικίνδυνες_Εγκαταστάσεις', 'has_exterior_sprinklers': 'Εξωτερικοί_Πυροσβεστήρες',
    'has_ember_vents': 'Αεραγωγοί_Αντιπυρικοί', 'has_flood_barriers': 'Αντιπλημμυρικά_Εμπόδια',
    'has_sump_pump': 'Αντλία_Υδάτων', 'has_seismic_retrofit': 'Αντισεισμική_Ενίσχυση',
    'has_gas_valve': 'Βαλβίδα_Αερίου', 'property_value_euro': 'Αξία_Ακινήτου_Ευρώ',
    'historical_fire_claim_euro': 'Ιστορική_Ζημιά_Φωτιάς_Ευρώ', 'historical_flood_claim_euro': 'Ιστορική_Ζημιά_Πλημμύρας_Ευρώ',
    'historical_earthquake_claim_euro': 'Ιστορική_Ζημιά_Σεισμού_Ευρώ', 'historical_annual_premium': 'Ιστορικό_Ετήσιο_Ασφάλιστρο'
}
df.rename(columns=greek_columns, inplace=True)

# =========================================================================
# ☁️ IBM CLOUD OBJECT STORAGE INTEGRATION (Enterprise MLOps)
# =========================================================================
COS_API_KEY_ID = os.getenv("COS_API_KEY_ID")
COS_INSTANCE_CRN = os.getenv("COS_INSTANCE_CRN")
COS_ENDPOINT = os.getenv("COS_ENDPOINT", "https://s3.eu-de.cloud-object-storage.appdomain.cloud")
BUCKET_NAME = os.getenv("BUCKET_NAME", "dualboots-insurance-2026")

print("\n🚀 Σύνδεση με IBM Cloud Object Storage...")
cos = ibm_boto3.client("s3",
    ibm_api_key_id=COS_API_KEY_ID,
    ibm_service_instance_id=COS_INSTANCE_CRN,
    config=Config(signature_version="oauth"),
    endpoint_url=COS_ENDPOINT
)

print(f"☁️ Ανέβασμα του Parquet Data Lake στο bucket: {BUCKET_NAME}...")
parquet_buffer = io.BytesIO()
df.to_parquet(parquet_buffer, index=False)
parquet_buffer.seek(0)
cos.upload_fileobj(parquet_buffer, BUCKET_NAME, "historical_insurance_data_lake.parquet")

print("✅ ΕΠΙΤΥΧΙΑ! Το Data Lake βρίσκεται πλέον με ασφάλεια στο IBM Cloud!")
print(f"✅ ΕΠΙΤΥΧΙΑ! Το Parquet ανανεώθηκε με αληθινά API δεδομένα και Ελληνικές στήλες.")
