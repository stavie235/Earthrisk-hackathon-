import pandas as pd
import numpy as np
import os
import io
import ibm_boto3
from ibm_botocore.client import Config

print("⏳ Δημιουργία Ιστορικών Δεδομένων 2000-2026 (Time-Series) για 1000 κτίρια...")

# Λίστα με 1000 κτίρια
building_ids = [f"BLD_{str(i).zfill(4)}" for i in range(1, 1001)]
years = list(range(2000, 2027))

data = []

# Προσομοίωση ιστορικού: Κάθε χρόνο το σπίτι παλιώνει, ο πληθωρισμός ανεβαίνει
# και η κλιματική αλλαγή (ακραία φαινόμενα) προσθέτει ρίσκο.
for bld in building_ids:
    base_premium = np.random.uniform(200, 600)  # Αρχικό ασφάλιστρο το 2000

    for year in years:
        age_in_year = year - 1980  # Ας πούμε ότι χτίστηκαν γύρω στο '80

        # Η κλιματική αλλαγή αρχίζει να επηρεάζει επιθετικά μετά το 2010
        climate_penalty = 0 if year < 2010 else (year - 2010) * 1.5

        # Το ασφάλιστρο ανεβαίνει λόγω ηλικίας, πληθωρισμού (2% το χρόνο) και κλίματος
        yearly_premium = base_premium * (1.02 ** (year - 2000)) + (age_in_year * 0.5) + climate_penalty

        data.append({
            "building_id": bld,
            "year": year,
            "building_age_in_given_year": age_in_year,
            "climate_risk_index": round(climate_penalty, 2),
            "annual_premium_euro": round(yearly_premium, 2)
        })

df_trends = pd.DataFrame(data)
print(f"✅ Δημιουργήθηκαν {len(df_trends)} εγγραφές ιστορικού (Year-by-Year Trends).")

# =========================================================================
# ☁️ IBM CLOUD OBJECT STORAGE: ΑΝΕΒΑΣΜΑ ΣΤΟ DATALAKE
# =========================================================================
COS_API_KEY_ID = os.getenv("COS_API_KEY_ID")
COS_INSTANCE_CRN = os.getenv("COS_INSTANCE_CRN")
COS_ENDPOINT = os.getenv("COS_ENDPOINT", "https://s3.eu-de.cloud-object-storage.appdomain.cloud")
BUCKET_NAME = os.getenv("BUCKET_NAME", "dualboots-insurance-2026")
FILE_NAME = "building_history_trends_2000_2026.parquet"

print(f"\n🚀 Σύνδεση με IBM Cloud... Ανέβασμα του {FILE_NAME}...")

cos = ibm_boto3.client("s3",
    ibm_api_key_id=COS_API_KEY_ID,
    ibm_service_instance_id=COS_INSTANCE_CRN,
    config=Config(signature_version="oauth"),
    endpoint_url=COS_ENDPOINT
)

# Μετατροπή σε Parquet στη μνήμη RAM
buffer = io.BytesIO()
df_trends.to_parquet(buffer, index=False)
buffer.seek(0)

# Μεταφόρτωση
cos.upload_fileobj(buffer, BUCKET_NAME, FILE_NAME)
print(f"✅ ΕΠΙΤΥΧΙΑ! Το ιστορικό αρχείο προσγειώθηκε στο IBM Cloud Data Lake!")
