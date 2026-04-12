import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, roc_auc_score, mean_absolute_error, r2_score
import joblib
import shap
import warnings
import os
import ibm_boto3
from ibm_botocore.client import Config

warnings.filterwarnings('ignore')

print("\n" + "="*80)
print("🚀 ΕΚΚΙΝΗΣΗ FAST TRAINING V2 (7 ΕΓΚΕΦΑΛΟΙ + SHAP XAI)")
print("="*80)

print("Φόρτωση του ml_ready_data_lake.parquet...")
df = pd.read_parquet('ml_ready_data_lake.parquet')

# Αφαίρεση μεταδεδομένων και targets με τις Ελληνικές τους ονομασίες
X = df.drop(columns=[
    'Κωδικός_Ακινήτου', 'Νομός', 'Διεύθυνση', 'Γεωγραφικό_Πλάτος', 'Γεωγραφικό_Μήκος',
    'Ιστορική_Ζημιά_Φωτιάς_Ευρώ', 'Ιστορική_Ζημιά_Πλημμύρας_Ευρώ',
    'Ιστορική_Ζημιά_Σεισμού_Ευρώ', 'Ιστορικό_Ετήσιο_Ασφάλιστρο'
])

joblib.dump(list(X.columns), 'web_app_features_final.pkl')

claim_targets = {
    'Fire': 'Ιστορική_Ζημιά_Φωτιάς_Ευρώ',
    'Flood': 'Ιστορική_Ζημιά_Πλημμύρας_Ευρώ',
    'Earthquake': 'Ιστορική_Ζημιά_Σεισμού_Ευρώ'
}

for name, target_col in claim_targets.items():
    print(f"\n--- 🛠️ Εκπαίδευση Two-Stage: {name.upper()} ---")

    y_amount = df[target_col]
    y_class = (y_amount > 0).astype(int)

    X_train_clf, X_test_clf, y_train_clf, y_test_clf = train_test_split(X, y_class, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=200, max_depth=10, class_weight='balanced', random_state=42, n_jobs=-1)
    clf.fit(X_train_clf, y_train_clf)

    preds_clf = clf.predict(X_test_clf)
    probs_clf = clf.predict_proba(X_test_clf)[:, 1]

    print(f"  [Εγκέφαλος 1 - Πιθανότητα] Ακρίβεια: {accuracy_score(y_test_clf, preds_clf):.2f} | ROC-AUC: {roc_auc_score(y_test_clf, probs_clf):.2f}")
    joblib.dump(clf, f'model_{name.lower()}_classifier.pkl')

    X_pos = X[y_amount > 0]
    y_pos = y_amount[y_amount > 0]

    if len(X_pos) > 5:
        reg = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
        reg.fit(X_pos, y_pos)
        preds_reg = reg.predict(X_pos)
        print(f"  [Εγκέφαλος 2 - Κόστος] MAE: {mean_absolute_error(y_pos, preds_reg):.2f} €")
        joblib.dump(reg, f'model_{name.lower()}_regressor.pkl')
    else:
        print("  ⚠️ Πολύ λίγες ζημιές για εκπαίδευση Regressor.")

print("\n--- 💰 Εκπαίδευση Μοντέλου: PREMIUM (Απλό Regression) ---")
y_premium = df['Ιστορικό_Ετήσιο_Ασφάλιστρο']
X_train_prem, X_test_prem, y_train_prem, y_test_prem = train_test_split(X, y_premium, test_size=0.2, random_state=42)

reg_premium = RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42, n_jobs=-1)
reg_premium.fit(X_train_prem, y_train_prem)
preds_prem = reg_premium.predict(X_test_prem)

print(f"  [Εγκέφαλος 7 - Ασφάλιστρο] R2 Score: {r2_score(y_test_prem, preds_prem):.4f}")
print(f"  [Εγκέφαλος 7 - Ασφάλιστρο] MAE: {mean_absolute_error(y_test_prem, preds_prem):.2f} €")
joblib.dump(reg_premium, 'model_premium_regressor.pkl')

print("\n--- 🧠 Εκπαίδευση Εξηγησιμότητας (SHAP) ---")
explainer_premium = shap.TreeExplainer(reg_premium)
joblib.dump(explainer_premium, 'shap_explainer_premium.pkl')
print("  💾 Αποθηκεύτηκε: shap_explainer_premium.pkl (Ο Μεταφραστής του AI είναι έτοιμος!)")
print("\n" + "="*80)
print("✅ Η ΕΚΠΑΙΔΕΥΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ!")

# =========================================================================
# ☁️ IBM CLOUD MODEL REGISTRY: ΑΠΟΘΗΚΕΥΣΗ ΤΩΝ AI ΜΟΝΤΕΛΩΝ
# =========================================================================
print("\n🚀 [Enterprise MLOps] Μεταφορά των AI Μοντέλων στο Cloud Artifact Store...")

COS_API_KEY_ID = os.getenv("COS_API_KEY_ID")
COS_INSTANCE_CRN = os.getenv("COS_INSTANCE_CRN")
COS_ENDPOINT = os.getenv("COS_ENDPOINT", "https://s3.eu-de.cloud-object-storage.appdomain.cloud")
BUCKET_NAME = os.getenv("BUCKET_NAME", "dualboots-insurance-2026")

cos = ibm_boto3.client("s3",
    ibm_api_key_id=COS_API_KEY_ID,
    ibm_service_instance_id=COS_INSTANCE_CRN,
    config=Config(signature_version="oauth"),
    endpoint_url=COS_ENDPOINT
)

# Σάρωση του φακέλου για να βρούμε όλους τους "Εγκεφάλους" (.pkl αρχεία)
pkl_files = [f for f in os.listdir('.') if f.endswith('.pkl')]

# Ανέβασμα του κάθε μοντέλου στον ειδικό φάκελο 'models/' μέσα στο Bucket
for pkl in pkl_files:
    print(f"☁️ Μεταφόρτωση: {pkl} ...")
    cos.upload_file(pkl, BUCKET_NAME, f"models/{pkl}")

print("✅ ΕΠΙΤΥΧΙΑ! Όλοι οι AI Εγκέφαλοι (Models & SHAP) αποθηκεύτηκαν στο IBM Cloud!")
