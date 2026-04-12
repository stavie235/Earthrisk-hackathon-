import requests
import warnings
from datetime import datetime, timedelta # 🚀 ΝΕΟ: Βιβλιοθήκη για τον Χρόνο!

# Κλείνουμε τα warnings αν υπάρχουν θέματα με τα SSL certificates
warnings.filterwarnings('ignore')

def get_elevation(lat, lon):
    """
    Φέρνει το ακριβές υψόμετρο του σπιτιού σε μέτρα (Flood Risk).
    Πηγή: Open-Meteo Elevation API (Δωρεάν, no key)
    """
    try:
        url = f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        # Επιστρέφει το υψόμετρο
        if 'elevation' in data:
            return data['elevation'][0]
        return 0.0 # Default αν το σπίτι είναι στη θάλασσα
    except Exception as e:
        print(f"⚠️ Σφάλμα στο Elevation API: {e}")
        return 50.0 # Fallback value


def get_earthquake_history(lat, lon, radius_km=50, min_magnitude=4.5):
    """
    Φέρνει τον αριθμό των ισχυρών σεισμών (>4.5 Ρίχτερ) που έχουν 
    χτυπήσει σε ακτίνα 50χλμ γύρω από το σπίτι τα τελευταία 50 χρόνια! (Earthquake Risk)
    Πηγή: USGS Earthquake Catalog API (Δωρεάν, no key)
    """
    try:
        # Ψάχνουμε από το 1970 μέχρι σήμερα
        url = f"https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude={lat}&longitude={lon}&maxradiuskm={radius_km}&minmagnitude={min_magnitude}&starttime=1970-01-01"
        
        response = requests.get(url, timeout=5)
        data = response.json()
        
        # Επιστρέφει το ΠΛΗΘΟΣ των σεισμών
        return len(data['features'])
    except Exception as e:
        print(f"⚠️ Σφάλμα στο Earthquake API: {e}")
        return 2 # Fallback value


def get_climate_data(lat, lon):
    """
    Φέρνει ιστορικά κλιματικά δεδομένα των τελευταίων 365 ημερών! (ΔΥΝΑΜΙΚΑ)
    Πηγή: Open-Meteo Historical Weather (Δωρεάν, no key)
    """
    try:
        # 🚀 Δυναμικός υπολογισμός ημερομηνιών (Κυλιόμενο Έτος)
        # Βάζουμε 5 μέρες καθυστέρηση (offset) γιατί τα Archive APIs θέλουν χρόνο να επικυρώσουν τον καιρό
        end_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=370)).strftime('%Y-%m-%d')
        
        url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&daily=precipitation_sum,temperature_2m_max&timezone=Europe/Athens"
        response = requests.get(url, timeout=5)
        data = response.json()

        if 'daily' not in data:
            return {"annual_rainfall_mm": 500.0, "avg_summer_temp_C": 32.0}

        daily_time = data['daily']['time']
        daily_precip = data['daily']['precipitation_sum']
        daily_temp = data['daily']['temperature_2m_max']
        
        annual_rainfall = 0.0
        summer_temps = []
        
        # Διατρέχουμε μέρα-μέρα τον τελευταίο χρόνο!
        for date_str, precip, temp in zip(daily_time, daily_precip, daily_temp):
            if precip is not None:
                annual_rainfall += precip
            
            if temp is not None:
                # Διαβάζουμε το Μήνα από το string "YYYY-MM-DD"
                month = int(date_str.split('-')[1])
                # Κρατάμε τη θερμοκρασία ΜΟΝΟ αν είναι Ιούνιος (6), Ιούλιος (7) ή Αύγουστος (8)
                if month in [6, 7, 8]:
                    summer_temps.append(temp)
        
        avg_summer_temp = sum(summer_temps) / len(summer_temps) if summer_temps else 30.0
        
        return {
            "annual_rainfall_mm": round(annual_rainfall, 2),
            "avg_summer_temp_C": round(avg_summer_temp, 2)
        }
    except Exception as e:
        print(f"⚠️ Σφάλμα στο Climate API: {e}")
        return {"annual_rainfall_mm": 500.0, "avg_summer_temp_C": 32.0}


# --- ΔΟΚΙΜΗ ΤΟΥ ΚΩΔΙΚΑ (TEST) ---
if __name__ == "__main__":
    print("\n🌍 ΔΟΚΙΜΗ ΕΞΩΤΕРИΚΩΝ APIs ΓΙΑ EARTHRISK")
    print("-" * 50)
    
    # Βάζουμε συντεταγμένες Αθήνας (Σύνταγμα)
    test_lat, test_lon = 37.9753, 23.7361
    print(f"📍 Τοποθεσία: Αθήνα (Lat: {test_lat}, Lon: {test_lon})\n")
    
    # 1. Υψόμετρο
    elev = get_elevation(test_lat, test_lon)
    print(f"🌊 Flood Risk -> Υψόμετρο: {elev} μέτρα")
    
    # 2. Σεισμοί
    quakes = get_earthquake_history(test_lat, test_lon)
    print(f"🌋 Quake Risk -> Ισχυροί Σεισμοί (>4.5R) σε 50km: {quakes} σεισμοί")
    
    # 3. Κλίμα (Δυναμικό)
    climate = get_climate_data(test_lat, test_lon)
    print(f"🔥 Fire Risk  -> Μέση Καλοκαιρινή Θερμ. (Τελευταίοι 12 Μήνες): {climate['avg_summer_temp_C']} °C")
    print(f"⛈️ Flood Risk -> Ετήσια Βροχόπτωση (Τελευταίοι 12 Μήνες): {climate['annual_rainfall_mm']} mm")
    print("-" * 50)