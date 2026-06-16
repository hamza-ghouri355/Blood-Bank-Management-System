// db/connection.js
// Sets up SQLite connection, initializes schema + seed data on first run.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'bloodbank.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

const dbExists = fs.existsSync(DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database at', DB_PATH);
});

db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;');

    if (!dbExists) {
        console.log('No existing DB found. Initializing schema...');
        const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
        db.exec(schemaSql, (err) => {
            if (err) {
                console.error('Error running schema.sql:', err.message);
                return;
            }
            console.log('Schema created successfully.');

            const seedSql = fs.readFileSync(SEED_PATH, 'utf8');
            db.exec(seedSql, (err) => {
                if (err) {
                    console.error('Error running seed.sql:', err.message);
                    return;
                }
                console.log('Seed data inserted successfully.');
            });
        });
    } else {
        console.log('Existing database found. Skipping initialization.');
    }
});

module.exports = db;
