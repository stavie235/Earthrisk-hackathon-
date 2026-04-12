const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (process.env.NODE_ENV === 'test') {
  process.env.DB_NAME = process.env.DB_TEST_NAME;
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log("DB_USER =", process.env.DB_USER);
console.log("DB_PASSWORD =", process.env.DB_PASSWORD ? "SET" : "MISSING");
console.log("DB_NAME =", process.env.DB_NAME);

const promisePool = db.promise();

// Attach a close method to the exported object for graceful shutdown in tests
promisePool.close = () => {
  return new Promise((resolve, reject) => {
    db.end(err => {
      if (err) return reject(err);
      resolve();
    });
  });
};

module.exports = promisePool;
