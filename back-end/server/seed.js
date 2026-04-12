/**
 * Seed default users on first startup.
 * Run before the server starts — skips inserts if users already exist.
 */
const bcrypt = require('bcryptjs');
const db = require('./config/db');

const SEED_USERS = [
    { username: 'user',  email: 'user@earthrisk.io',  password: 'user',  role: 'user'  },
    { username: 'admin', email: 'admin@earthrisk.io', password: 'admin', role: 'admin' },
];

async function seed() {
    for (const u of SEED_USERS) {
        const [rows] = await db.query('SELECT user_id FROM Users WHERE username = ?', [u.username]);
        if (rows.length > 0) {
            console.log(`[seed] ${u.username} already exists — skipping`);
            continue;
        }
        const hash = await bcrypt.hash(u.password, 10);
        await db.query(
            'INSERT INTO Users (username, email, safe_password, role) VALUES (?, ?, ?, ?)',
            [u.username, u.email, hash, u.role]
        );
        console.log(`[seed] Created ${u.role}: ${u.username}`);
    }
    await db.close();
}

seed().catch(err => {
    console.error('[seed] Failed:', err.message);
    process.exit(1);
});
