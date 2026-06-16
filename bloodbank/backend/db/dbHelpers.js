// db/dbHelpers.js
// Wraps sqlite3's callback-based methods in Promises for async/await use.

const db = require('./connection');

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// Run multiple statements as a transaction
function transaction(actions) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            actions()
                .then((result) => {
                    db.run('COMMIT', (err) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                })
                .catch((err) => {
                    db.run('ROLLBACK', () => reject(err));
                });
        });
    });
}

module.exports = { all, get, run, transaction, db };
