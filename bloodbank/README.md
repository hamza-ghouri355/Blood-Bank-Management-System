# Blood Bank Management System (CS-229T DBMS Project)

## Tech Stack
- **Database:** SQLite3 (file-based, no separate server needed)
- **Backend:** Node.js + Express.js (plain JavaScript)
- **Frontend:** Plain HTML, CSS, vanilla JavaScript (fetch API)
- **Query layer:** Raw SQL via the `sqlite3` driver (no ORM)

## Project Structure
```
bloodbank/
├── backend/
│   ├── db/
│   │   ├── schema.sql       -- tables, constraints, triggers, views, indexes
│   │   ├── seed.sql         -- sample data
│   │   ├── connection.js    -- opens/initializes the SQLite DB
│   │   ├── dbHelpers.js      -- promise wrappers for sqlite3 callbacks
│   │   └── reset.js         -- wipes & rebuilds DB from schema+seed
│   ├── controllers/         -- business logic per entity
│   ├── routes/              -- Express route definitions
│   ├── server.js            -- app entry point
│   └── package.json
└── frontend/
    ├── index.html           -- Dashboard
    ├── donors.html
    ├── inventory.html
    ├── donations.html
    ├── hospitals.html
    ├── requests.html
    ├── css/styles.css
    └── js/                  -- one JS file per page + shared api.js, nav.js
```

## Setup (Windows / Mac / Linux)

1. Install **Node.js** (LTS) from https://nodejs.org if not already installed.
2. Open a terminal in the `backend` folder:
   ```
   cd bloodbank/backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
   On first run, this automatically creates `db/bloodbank.db` from
   `schema.sql` + `seed.sql`.
5. Open your browser to:
   ```
   http://localhost:3000
   ```

## Resetting the Database
To wipe the database and re-seed it from scratch:
```
npm run reset-db
```

## Database Design Notes

### Tables (3NF)
1. `donors` — donor registration, blood type, eligibility
2. `blood_inventory` — blood units, expiry, storage, status
3. `donations` — links donor → inventory unit
4. `hospitals` — registered hospitals
5. `emergency_requests` — hospital blood requests
6. `request_fulfillment` — links request → allocated inventory units

### Constraints
- `CHECK` constraints on blood types, statuses, urgency levels
- `CHECK (expiry_date > collection_date)` on inventory and donations
- `UNIQUE` constraints on phone/email (donors, hospitals)
- Foreign keys with `ON DELETE CASCADE` / `ON DELETE SET NULL`

### Views
- `available_blood_summary` — units available grouped by blood type
- `expiring_soon` — units expiring within 7 days

### Triggers
- `trg_fulfillment_update_inventory` — marks allocated units as 'Used'
  and updates request status (fulfilled/partially_fulfilled)
- `trg_inventory_check_expiry` / `trg_inventory_insert_expiry` — auto-flags
  expired units
- `trg_donation_update_donor` — updates donor's last_donation_date and
  recomputes eligibility (90-day rule) on new donation

### "Stored Procedures" (implemented as backend transactions)
SQLite does not support `CREATE PROCEDURE`. The two required procedures
are implemented as atomic transactions in the controllers:
- **Process emergency request** — `requestController.fulfillRequest()`
  (POST `/api/requests/:id/fulfill`): checks availability, allocates
  units (FIFO by soonest expiry), logs fulfillment, updates status —
  all within a single transaction.
- **Calculate donor eligibility** — `donorController.computeEligibility()`
  and `recalculateEligibility()` (POST `/api/donors/:id/recalculate-eligibility`):
  applies the 90-day donation gap rule.

### Indexes
On `blood_type`, `expiry_date`, `status` (inventory), `blood_type` (donors),
`donor_id` (donations), `blood_type`/`status` (requests).

## API Endpoints Summary

| Resource | Endpoints |
|---|---|
| Donors | GET/POST `/api/donors`, GET/PUT/DELETE `/api/donors/:id`, POST `/api/donors/:id/recalculate-eligibility` |
| Inventory | GET/POST `/api/inventory`, GET/PUT/DELETE `/api/inventory/:id`, GET `/api/inventory/summary/available`, GET `/api/inventory/summary/expiring`, POST `/api/inventory/check-expiry` |
| Donations | GET/POST `/api/donations`, GET/DELETE `/api/donations/:id`, GET `/api/donations/recent` |
| Hospitals | GET/POST `/api/hospitals`, GET/PUT/DELETE `/api/hospitals/:id` |
| Requests | GET/POST `/api/requests`, GET `/api/requests/pending`, GET `/api/requests/:id`, PUT `/api/requests/:id/reject`, POST `/api/requests/:id/fulfill` |
| Dashboard | GET `/api/dashboard` |

## Next Steps (Phase 2 / 3 ideas)
- ER and EER diagrams (donor specialization e.g. "Regular Donor" vs
  "First-Time Donor" as a subclass)
- Authentication (admin login)
- Reports/export (CSV/PDF) of donations and inventory
- Search/pagination for large tables
