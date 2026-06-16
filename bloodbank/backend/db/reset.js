// db/reset.js
// Deletes the existing SQLite database file and re-creates it from
// schema.sql + seed.sql. Run with: npm run reset-db

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bloodbank.db');

if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Existing database deleted.');
} else {
    console.log('No existing database found.');
}

// Re-require connection.js triggers initialization since file no longer exists
require('./connection');

// Give it a moment to finish async exec calls, then exit
setTimeout(() => {
    console.log('Database reset complete.');
    process.exit(0);
}, 1500);
