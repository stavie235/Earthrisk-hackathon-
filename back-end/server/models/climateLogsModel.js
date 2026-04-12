const db = require('../config/db');

class ClimateLogsModel {
	// Get all climate logs for a postal code
	static async getByPostalCode(postal_code) {
		const sql = `
			SELECT 
				log_id,
				postal_code,
				log_year,
				avg_temp,
				extreme_events,
				co2_level
			FROM ClimateLogs
			WHERE postal_code = ?
			ORDER BY log_year DESC
		`;
		const [rows] = await db.query(sql, [postal_code]);
		return rows;
	}

	// Get climate logs for a postal code within a year range
	static async getByPostalCodeAndYearRange(postal_code, start_year, end_year) {
		const sql = `
			SELECT 
				log_id,
				postal_code,
				log_year,
				avg_temp,
				extreme_events,
				co2_level
			FROM ClimateLogs
			WHERE postal_code = ? AND log_year BETWEEN ? AND ?
			ORDER BY log_year ASC
		`;
		const [rows] = await db.query(sql, [postal_code, start_year, end_year]);
		return rows;
	}

	// Get all climate logs
	static async getAll() {
		const sql = `
			SELECT 
				log_id,
				postal_code,
				log_year,
				avg_temp,
				extreme_events,
				co2_level
			FROM ClimateLogs
			ORDER BY postal_code, log_year DESC
		`;
		const [rows] = await db.query(sql);
		return rows;
	}

	// Create new climate log entry
	static async create(postal_code, log_year, avg_temp, extreme_events = 0, co2_level = null) {
		const sql = `
			INSERT INTO ClimateLogs 
			(postal_code, log_year, avg_temp, extreme_events, co2_level)
			VALUES (?, ?, ?, ?, ?)
		`;
		const [result] = await db.query(sql, [postal_code, log_year, avg_temp, extreme_events, co2_level]);
		return result;
	}

	// Update climate log entry
	static async update(log_id, updates) {
		const fields = [];
		const values = [];

		if (Object.prototype.hasOwnProperty.call(updates, 'avg_temp')) {
			fields.push('avg_temp = ?');
			values.push(updates.avg_temp);
		}
		if (Object.prototype.hasOwnProperty.call(updates, 'extreme_events')) {
			fields.push('extreme_events = ?');
			values.push(updates.extreme_events);
		}
		if (Object.prototype.hasOwnProperty.call(updates, 'co2_level')) {
			fields.push('co2_level = ?');
			values.push(updates.co2_level);
		}

		if (fields.length === 0) return null;

		values.push(log_id);
		const sql = `UPDATE ClimateLogs SET ${fields.join(', ')} WHERE log_id = ?`;
		const [result] = await db.query(sql, values);
		return result;
	}

	// Delete climate log entry
	static async delete(log_id) {
		const sql = 'DELETE FROM ClimateLogs WHERE log_id = ?';
		const [result] = await db.query(sql, [log_id]);
		return result;
	}
}

module.exports = ClimateLogsModel;
