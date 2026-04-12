DROP SCHEMA IF EXISTS `earthrisk`;
CREATE SCHEMA `earthrisk`;
USE earthrisk;


-- -----------------------------------------------------
-- Table Building
-- -----------------------------------------------------
CREATE TABLE Building (
    building_id           INT PRIMARY KEY AUTO_INCREMENT,
    external_id           VARCHAR(20),          -- BLD_xxxx from data loader
    building_name         VARCHAR(255),         -- human-readable property title
    address               VARCHAR(255) NOT NULL,
    latitude              DECIMAL(10,7) NOT NULL,
    longitude             DECIMAL(10,7) NOT NULL,
    postal_code           INT,
    google_maps_link      VARCHAR(255),

    -- Physical attributes
    building_type         ENUM('residential','commercial','industrial','mixed','other') NOT NULL DEFAULT 'residential',
    year_built            YEAR,
    floors                TINYINT UNSIGNED,
    area_sqm              DECIMAL(10,2),
    construction_material ENUM('concrete','brick','wood','steel','mixed') DEFAULT 'concrete',

    -- Risk factors
    flood_zone            ENUM('none','low','medium','high') DEFAULT 'none',
    earthquake_zone       ENUM('none','low','medium','high') DEFAULT 'none',
    fire_risk             ENUM('low','medium','high') DEFAULT 'low',
    proximity_to_water    DECIMAL(8,2),
    elevation_m           DECIMAL(8,2),

    -- ML / EarthRisk fields
    prefecture            VARCHAR(100),
    crime_rate            ENUM('low','medium','high') DEFAULT 'low',
    near_nature           TINYINT(1) DEFAULT 0,
    has_alarm             TINYINT(1) DEFAULT 0,
    has_cameras           TINYINT(1) DEFAULT 0,
    has_security_door     TINYINT(1) DEFAULT 0,
    typos                 ENUM('permanent','vacation','airbnb') DEFAULT 'permanent',
    coverage_scope        ENUM('building_only','building_and_contents') DEFAULT 'building_only',
    coverage_level        ENUM('basic','standard','full') DEFAULT 'basic',
    deductible_euro       INT DEFAULT 0,
    underinsured          TINYINT(1) DEFAULT 0,
    annual_premium_euro   DECIMAL(10,2),
    actual_value_euro     DECIMAL(12,2),
    declared_value_euro   DECIMAL(12,2),
    nasa_avg_temp_c       DECIMAL(5,2),

    -- Risk score (0.00 to 100.00) and computed category
    risk_score            DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    risk_category         ENUM('very_low','low','medium','high','very_high') GENERATED ALWAYS AS (
        CASE
            WHEN risk_score < 20 THEN 'very_low'
            WHEN risk_score < 40 THEN 'low'
            WHEN risk_score < 60 THEN 'medium'
            WHEN risk_score < 80 THEN 'high'
            ELSE 'very_high'
        END
    ) STORED,

    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- -----------------------------------------------------
-- Table BuildingHistory (yearly ML snapshots per building)
-- -----------------------------------------------------
CREATE TABLE BuildingHistory (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    building_id         INT NOT NULL,
    record_year         YEAR NOT NULL,
    risk_score          DECIMAL(5,2),
    annual_premium_euro DECIMAL(10,2),
    actual_value_euro   DECIMAL(12,2),
    nasa_avg_temp_c     DECIMAL(5,2),
    building_age        SMALLINT,

    FOREIGN KEY (building_id) REFERENCES Building(building_id) ON DELETE CASCADE,
    INDEX (building_id, record_year)
);


-- -----------------------------------------------------
-- Table Users
-- -----------------------------------------------------
CREATE TABLE Users (
    user_id       INT PRIMARY KEY AUTO_INCREMENT,
    username      VARCHAR(255) NOT NULL,
    safe_password VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    -- billing info
    card_number   DECIMAL(16,0),
    card_name     VARCHAR(45),
    card_exp_date DATE,
    card_cvv      DECIMAL(3,0),
    -- ----------------
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role          ENUM('user','admin') NOT NULL

);


-- -----------------------------------------------------
-- Table InsuranceHistory (Σύνδεση Χρήστη-Κτηρίου & Τιμολόγηση)
-- -----------------------------------------------------
CREATE TABLE InsuranceHistory (
    policy_id       INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL,
    building_id     INT NOT NULL,
    premium_amount  DECIMAL(10,2) NOT NULL, -- Το ποσό που πλήρωσε
    policy_year     YEAR NOT NULL,          -- Έτος αναφοράς
    risk_score_then DECIMAL(5,2),           -- Το score που είχε τότε το κτήριο
    status          ENUM('active', 'expired', 'cancelled') DEFAULT 'expired',
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (building_id) REFERENCES Building(building_id)
);

-- -----------------------------------------------------
-- Table ClimateLogs (Ιστορικά κλιματικά δεδομένα ανά περιοχή)
-- -----------------------------------------------------
CREATE TABLE ClimateLogs (
    log_id          INT PRIMARY KEY AUTO_INCREMENT,
    postal_code     INT NOT NULL,           -- Σύνδεση μέσω ΤΚ για ταχύτητα
    log_year        YEAR NOT NULL,
    avg_temp        DECIMAL(4,2),           -- Μέση ετήσια θερμοκρασία
    extreme_events  INT DEFAULT 0,          -- Πλήθος ακραίων φαινομένων (καύσωνες/πλημμύρες)
    co2_level       INT,                    -- Προαιρετικό: Τοπικό αποτύπωμα
    
    INDEX (postal_code),
    INDEX (log_year)
);



-- -----------------------------------------------------
-- Indexes
-- -----------------------------------------------------
CREATE INDEX idx_building_type      ON Building (building_type);
CREATE INDEX idx_risk_category      ON Building (risk_category);
CREATE INDEX idx_risk_score         ON Building (risk_score);
CREATE INDEX idx_postal_code        ON Building (postal_code);
CREATE INDEX idx_flood_zone         ON Building (flood_zone);
CREATE INDEX idx_earthquake_zone    ON Building (earthquake_zone);
