-- =====================================================
-- Seed Data
-- Blood Bank Management System - CS-229T
-- =====================================================

-- Donors (all have valid date_of_birth: at least 18 years old)
INSERT INTO donors (full_name, blood_type, gender, date_of_birth, phone, email, address, last_donation_date, eligibility_status) VALUES
('Ahmed Khan',   'O+',  'Male',   '1998-04-12', '03001234567', 'ahmed.khan@example.com',  'Karachi',    '2026-02-10', 'Eligible'),
('Sara Ali',     'A+',  'Female', '2000-09-23', '03007654321', 'sara.ali@example.com',    'Lahore',     '2026-05-30', 'Not Eligible'),
('Bilal Ahmed',  'B-',  'Male',   '1995-01-05', '03111112222', 'bilal.ahmed@example.com', 'Islamabad',  NULL,         'Eligible'),
('Fatima Noor',  'AB+', 'Female', '1999-11-17', '03222223333', 'fatima.noor@example.com', 'Karachi',    '2025-12-01', 'Eligible'),
('Hamza Tariq',  'O-',  'Male',   '2001-06-15', '03333334444', 'hamza.tariq@example.com', 'Lahore',     NULL,         'Eligible');

-- Hospitals
INSERT INTO hospitals (name, contact_person, phone, email, address) VALUES
('City General Hospital',        'Dr. Imran Sheikh', '0212233445', 'contact@citygeneral.pk', 'Saddar, Karachi'),
('Aga Khan University Hospital', 'Dr. Ayesha Raza',  '0213456789', 'info@akuh.pk',           'Stadium Road, Karachi'),
('Shaukat Khanum Memorial',      'Dr. Usman Tariq',  '0423456789', 'info@skm.pk',            'Johar Town, Lahore');

-- Blood Inventory (mix of available, soon-expiring, and one expired)
INSERT INTO blood_inventory (blood_type, volume_ml, collection_date, expiry_date, storage_location, status, donor_id) VALUES
('O+',  450, '2026-06-01', '2026-07-13', 'Fridge A1', 'Available', 1),
('A+',  450, '2026-05-20', '2026-06-25', 'Fridge A2', 'Available', 2),
('B-',  450, '2026-06-10', '2026-07-22', 'Fridge B1', 'Available', 3),
('AB+', 450, '2026-04-01', '2026-05-13', 'Fridge B2', 'Expired',   4),
('O-',  450, '2026-06-08', '2026-06-24', 'Fridge A1', 'Available', 5),
('O+',  450, '2026-06-05', '2026-06-23', 'Fridge A1', 'Available', NULL),
('A-',  450, '2026-06-09', '2026-07-21', 'Fridge A3', 'Available', NULL),
('B+',  450, '2026-06-12', '2026-07-24', 'Fridge B3', 'Available', NULL);

-- Donations (linking donors to the inventory units they produced)
INSERT INTO donations (donor_id, unit_id, donation_date, volume_ml, notes) VALUES
(1, 1, '2026-06-01', 450, 'Routine donation'),
(2, 2, '2026-05-20', 450, 'Routine donation'),
(3, 3, '2026-06-10', 450, 'First-time donor'),
(4, 4, '2026-04-01', 450, 'Routine donation'),
(5, 5, '2026-06-08', 450, 'Routine donation');

-- Emergency Requests
INSERT INTO emergency_requests (hospital_id, blood_type, units_requested, urgency_level, status, request_date) VALUES
(1, 'O+', 2, 'critical', 'pending', '2026-06-13 09:00:00'),
(2, 'B-', 1, 'medium',   'pending', '2026-06-13 11:30:00'),
(3, 'A-', 1, 'low',      'pending', '2026-06-14 08:00:00');