import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
import joblib
import os
import io
import ibm_boto3
from ibm_botocore.client import Config

# =========================================================================
# ☁️ IBM CLOUD OBJECT STORAGE: ΚΑΤΕΒΑΣΜΑ ΔΕΔΟΜΕΝΩΝ (Cloud-Native MLOps)
# =========================================================================
COS_API_KEY_ID = os.getenv("COS_API_KEY_ID")
COS_INSTANCE_CRN = os.getenv("COS_INSTANCE_CRN")
COS_ENDPOINT = os.getenv("COS_ENDPOINT", "https://s3.eu-de.cloud-object-storage.appdomain.cloud")
BUCKET_NAME = os.getenv("BUCKET_NAME", "dualboots-insurance-2026")
FILE_NAME = "historical_insurance_data_lake.parquet"

print(f"\n🚀 Σύνδεση με IBM Cloud... Γίνεται λήψη του {FILE_NAME} από το Bucket...")

cos = ibm_boto3.client("s3",
    ibm_api_key_id=COS_API_KEY_ID,
    ibm_service_instance_id=COS_INSTANCE_CRN,
    config=Config(signature_version="oauth"),
    endpoint_url=COS_ENDPOINT
)

# Αντί να γράψουμε το αρχείο στο δίσκο, το κατεβάζουμε απευθείας στη μνήμη RAM
buffer = io.BytesIO()
cos.download_fileobj(BUCKET_NAME, FILE_NAME, buffer)
buffer.seek(0)

# Φόρτωση στο Pandas απευθείας από τη μνήμη!
df = pd.read_parquet(buffer)
print("✅ ΕΠΙΤΥΧΙΑ! Τα δεδομένα κατέβηκαν από τη Φρανκφούρτη και φορτώθηκαν στη μνήμη!\n")

print("Έλεγχος για ελλιπή δεδομένα (Missing Values)...")
for col in df.columns:
    if df[col].isnull().sum() > 0:
        if df[col].dtype == 'object':
            df[col] = df[col].fillna(df[col].mode()[0])
        else:
            df[col] = df[col].fillna(df[col].mean())

# Η μεταβλητή τώρα είναι στα Ελληνικά!
df['Ηλικία_Κτιρίου'] = 2026 - df['Έτος_Κατασκευής']

# -------------------------------------------------------------------
# 2. 🌍 GEOSPATIAL FEATURE ENGINEERING (K-MEANS)
# -------------------------------------------------------------------
print("Εκπαίδευση 'Χαρτογράφου' (K-Means) για δημιουργία 4 Ζωνών Πυκνότητας...")
kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
df['Γεωγραφική_Ζώνη'] = kmeans.fit_predict(df[['Γεωγραφικό_Πλάτος', 'Γεωγραφικό_Μήκος']])
joblib.dump(kmeans, 'web_app_geozone_mapper.pkl')

# -------------------------------------------------------------------
# 3. FEATURE ENGINEERING & ΔΙΑΧΩΡΙΣΜΟΣ
# -------------------------------------------------------------------
print("Διαχωρισμός Metadata και Targets...")
meta_cols = ['Κωδικός_Ακινήτου', 'Νομός', 'Διεύθυνση', 'Γεωγραφικό_Πλάτος', 'Γεωγραφικό_Μήκος']
df_metadata = df[meta_cols].copy()

target_cols = [
    'Ιστορική_Ζημιά_Φωτιάς_Ευρώ',
    'Ιστορική_Ζημιά_Πλημμύρας_Ευρώ',
    'Ιστορική_Ζημιά_Σεισμού_Ευρώ',
    'Ιστορικό_Ετήσιο_Ασφάλιστρο'
]
y = df[target_cols].copy()

cols_to_drop = meta_cols + target_cols + ['Έτος_Κατασκευής']
X = df.drop(columns=cols_to_drop).copy()

# -------------------------------------------------------------------
# 4. ENCODING (Μετατροπή Κειμένου σε Αριθμούς)
# -------------------------------------------------------------------
print("Εφαρμογή Encoding (Boolean & One-Hot)...")
bool_cols = [
    'Υπόγειο', 'Κοντά_σε_Δάσος', 'Κοντά_σε_Επικίνδυνες_Εγκαταστάσεις',
    'Εξωτερικοί_Πυροσβεστήρες', 'Αεραγωγοί_Αντιπυρικοί', 'Αντιπλημμυρικά_Εμπόδια',
    'Αντλία_Υδάτων', 'Αντισεισμική_Ενίσχυση', 'Βαλβίδα_Αερίου'
]
for col in bool_cols:
    X[col] = X[col].astype(int)

nominal_cols = ['Τύπος_Ακινήτου', 'Υλικό_Κατασκευής', 'Τύπος_Σκεπής', 'Γεωγραφική_Ζώνη']
X = pd.get_dummies(X, columns=nominal_cols, drop_first=True)

for col in X.columns:
    if X[col].dtype == bool:
        X[col] = X[col].astype(int)

# -------------------------------------------------------------------
# 5. OUTLIER CLIPPING
# -------------------------------------------------------------------
print("Περικοπή ακραίων τιμών (Clipping στο 1% και 99%)...")
numeric_features = [
    'Τετραγωνικά_Μέτρα', 'Ηλικία_Κτιρίου', 'Υψόμετρο_Μέτρα',
    'Ετήσια_Βροχόπτωση_mm', 'Μέση_Θερμοκρασία_Καλοκαιριού_C', 'Απόσταση_από_Πυροσβεστική_km',
    'Ιστορικό_Σεισμών_50km', 'Αξία_Ακινήτου_Ευρώ', 'Σεισμική_Ζώνη'
]

for col in numeric_features:
    lower_limit = X[col].quantile(0.01)
    upper_limit = X[col].quantile(0.99)
    X[col] = X[col].clip(lower=lower_limit, upper=upper_limit)

# -------------------------------------------------------------------
# 6. NORMALIZATION (Κανονικοποίηση)
# -------------------------------------------------------------------
print("Κανονικοποίηση αριθμητικών δεδομένων στην κλίμακα [0, 1]...")
scaler = MinMaxScaler()
X[numeric_features] = scaler.fit_transform(X[numeric_features])

joblib.dump(scaler, 'web_app_scaler.pkl')
joblib.dump(list(X.columns), 'web_app_features.pkl')

# -------------------------------------------------------------------
# 7. ΤΕΛΙΚΗ ΣΥΓΧΩΝΕΥΣΗ
# -------------------------------------------------------------------
df_final_ml = pd.concat([df_metadata, X, y], axis=1)
df_final_ml.to_parquet('ml_ready_data_lake.parquet', index=False)

print("\n" + "="*70)
print("✅ Η ΠΡΟΕΠΕΞΕΡΓΑΣΙΑ ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ")
print("="*70)
