// tests/teardown.js
const db = require('../config/db');

module.exports = async () => {
  // The console logs are for debugging the teardown process itself.
  // console.log('\n[Teardown] Closing database connection...');
  try {
    await db.close();
    // console.log('[Teardown] Database connection closed successfully.');
  } catch (error) {
    console.error('[Teardown] Error closing database connection:', error);
  }
};
