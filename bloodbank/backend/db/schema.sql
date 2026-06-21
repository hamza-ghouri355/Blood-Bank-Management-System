-- =====================================================
-- Blood Bank Management System - Database Schema
-- CS-229T DBMS Project
-- Engine: SQLite3
-- =====================================================

PRAGMA foreign_keys = ON;

-- =====================================================
-- 1. DONORS
-- =====================================================
DROP TABLE IF EXISTS donors;
CREATE TABLE donors (
    donor_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name          TEXT NOT NULL,
    blood_type         TEXT NOT NULL CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    gender             TEXT CHECK (gender IN ('Male','Female','Other')),
    date_of_birth      DATE CHECK (
                           date_of_birth IS NULL OR (
                               date_of_birth >= '1900-01-01'
                               AND date_of_birth < '2100-01-01'
                           )
                       ),
    phone              TEXT NOT NULL UNIQUE,
    email              TEXT UNIQUE,
    address            TEXT,
    last_donation_date DATE,
    eligibility_status TEXT NOT NULL DEFAULT 'Eligible'
                           CHECK (eligibility_status IN ('Eligible','Not Eligible')),
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. BLOOD INVENTORY
-- =====================================================
DROP TABLE IF EXISTS blood_inventory;
CREATE TABLE blood_inventory (
    unit_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    blood_type       TEXT NOT NULL CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    volume_ml        INTEGER NOT NULL CHECK (volume_ml > 0),
    collection_date  DATE NOT NULL,
    expiry_date      DATE NOT NULL,
    storage_location TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'Available'
                         CHECK (status IN ('Available','Reserved','Expired','Used')),
    donor_id         INTEGER,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (expiry_date > collection_date),
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE SET NULL
);

-- =====================================================
-- 3. DONATIONS
-- =====================================================
DROP TABLE IF EXISTS donations;
CREATE TABLE donations (
    donation_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id      INTEGER NOT NULL,
    unit_id       INTEGER NOT NULL UNIQUE,
    donation_date DATE NOT NULL,
    volume_ml     INTEGER NOT NULL CHECK (volume_ml > 0),
    notes         TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id)  REFERENCES blood_inventory(unit_id) ON DELETE CASCADE
);

-- =====================================================
-- 4. HOSPITALS
-- =====================================================
DROP TABLE IF EXISTS hospitals;
CREATE TABLE hospitals (
    hospital_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL UNIQUE,
    contact_person TEXT,
    phone          TEXT NOT NULL UNIQUE,
    email          TEXT UNIQUE,
    address        TEXT,
    registered_on  DATE DEFAULT CURRENT_DATE
);

-- =====================================================
-- 5. EMERGENCY REQUESTS
-- =====================================================
DROP TABLE IF EXISTS emergency_requests;
CREATE TABLE emergency_requests (
    request_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    hospital_id     INTEGER NOT NULL,
    blood_type      TEXT NOT NULL CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    units_requested INTEGER NOT NULL CHECK (units_requested > 0),
    urgency_level   TEXT NOT NULL CHECK (urgency_level IN ('low','medium','critical')),
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','fulfilled','partially_fulfilled','rejected')),
    request_date    DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_date   DATETIME,
    notes           TEXT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
);

-- =====================================================
-- 6. REQUEST FULFILLMENT
-- =====================================================
DROP TABLE IF EXISTS request_fulfillment;
CREATE TABLE request_fulfillment (
    fulfillment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id     INTEGER NOT NULL,
    unit_id        INTEGER NOT NULL UNIQUE,
    allocated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES emergency_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id)    REFERENCES blood_inventory(unit_id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_inventory_blood_type  ON blood_inventory(blood_type);
CREATE INDEX idx_inventory_expiry      ON blood_inventory(expiry_date);
CREATE INDEX idx_inventory_status      ON blood_inventory(status);
CREATE INDEX idx_donors_blood_type     ON donors(blood_type);
CREATE INDEX idx_donations_donor_id    ON donations(donor_id);
CREATE INDEX idx_requests_blood_type   ON emergency_requests(blood_type);
CREATE INDEX idx_requests_status       ON emergency_requests(status);

-- =====================================================
-- VIEWS
-- =====================================================
DROP VIEW IF EXISTS available_blood_summary;
CREATE VIEW available_blood_summary AS
SELECT
    blood_type,
    COUNT(*)       AS units_available,
    SUM(volume_ml) AS total_volume_ml
FROM blood_inventory
WHERE status = 'Available'
GROUP BY blood_type;

DROP VIEW IF EXISTS expiring_soon;
CREATE VIEW expiring_soon AS
SELECT
    unit_id, blood_type, volume_ml, collection_date, expiry_date,
    storage_location, status,
    CAST((julianday(expiry_date) - julianday('now')) AS INTEGER) AS days_to_expiry
FROM blood_inventory
WHERE status = 'Available'
  AND date(expiry_date) <= date('now', '+7 days')
  AND date(expiry_date) >= date('now');

-- =====================================================
-- TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS trg_fulfillment_update_inventory;
CREATE TRIGGER trg_fulfillment_update_inventory
AFTER INSERT ON request_fulfillment
BEGIN
    UPDATE blood_inventory
    SET status = 'Used'
    WHERE unit_id = NEW.unit_id;

    UPDATE emergency_requests
    SET status = CASE
            WHEN (SELECT COUNT(*) FROM request_fulfillment WHERE request_id = NEW.request_id)
                 >= units_requested
            THEN 'fulfilled'
            ELSE 'partially_fulfilled'
        END,
        resolved_date = CASE
            WHEN (SELECT COUNT(*) FROM request_fulfillment WHERE request_id = NEW.request_id)
                 >= units_requested
            THEN CURRENT_TIMESTAMP
            ELSE resolved_date
        END
    WHERE request_id = NEW.request_id;
END;

DROP TRIGGER IF EXISTS trg_inventory_check_expiry;
CREATE TRIGGER trg_inventory_check_expiry
AFTER UPDATE ON blood_inventory
WHEN NEW.status = 'Available' AND date(NEW.expiry_date) < date('now')
BEGIN
    UPDATE blood_inventory
    SET status = 'Expired'
    WHERE unit_id = NEW.unit_id;
END;

DROP TRIGGER IF EXISTS trg_inventory_insert_expiry;
CREATE TRIGGER trg_inventory_insert_expiry
AFTER INSERT ON blood_inventory
WHEN NEW.status = 'Available' AND date(NEW.expiry_date) < date('now')
BEGIN
    UPDATE blood_inventory
    SET status = 'Expired'
    WHERE unit_id = NEW.unit_id;
END;

DROP TRIGGER IF EXISTS trg_donation_update_donor;
CREATE TRIGGER trg_donation_update_donor
AFTER INSERT ON donations
BEGIN
    UPDATE donors
    SET last_donation_date = NEW.donation_date,
        eligibility_status = CASE
            WHEN julianday(NEW.donation_date) >= julianday('now') - 90
            THEN 'Not Eligible'
            ELSE 'Eligible'
        END
    WHERE donor_id = NEW.donor_id;
END;