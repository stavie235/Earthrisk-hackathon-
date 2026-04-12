const db = require('../config/db');

class InsuranceHistoryModel {
	// Get all insurance history for a user
	static async getByUserId(user_id) {
		const sql = `
			SELECT 
				ih.policy_id,
				ih.user_id,
				ih.building_id,
				ih.premium_amount,
				ih.policy_year,
				ih.risk_score_then,
				ih.status,
				b.building_name,
				b.address,
				b.postal_code,
				b.building_type
			FROM InsuranceHistory ih
			JOIN Building b ON ih.building_id = b.building_id
			WHERE ih.user_id = ?
			ORDER BY ih.policy_year DESC
		`;
		const [rows] = await db.query(sql, [user_id]);
		return rows;
	}

	// Get insurance history for a specific building
	static async getByBuildingId(building_id) {
		const sql = `
			SELECT 
				policy_id,
				user_id,
				building_id,
				premium_amount,
				policy_year,
				risk_score_then,
				status
			FROM InsuranceHistory
			WHERE building_id = ?
			ORDER BY policy_year DESC
		`;
		const [rows] = await db.query(sql, [building_id]);
		return rows;
	}

	// Get insurance history for a user and specific building
	static async getByUserAndBuilding(user_id, building_id) {
		const sql = `
			SELECT 
				policy_id,
				user_id,
				building_id,
				premium_amount,
				policy_year,
				risk_score_then,
				status
			FROM InsuranceHistory
			WHERE user_id = ? AND building_id = ?
			ORDER BY policy_year DESC
		`;
		const [rows] = await db.query(sql, [user_id, building_id]);
		return rows;
	}

	// Create new insurance history record
	static async create(user_id, building_id, premium_amount, policy_year, risk_score_then, status = 'active') {
		const sql = `
			INSERT INTO InsuranceHistory 
			(user_id, building_id, premium_amount, policy_year, risk_score_then, status)
			VALUES (?, ?, ?, ?, ?, ?)
		`;
		const [result] = await db.query(sql, [user_id, building_id, premium_amount, policy_year, risk_score_then, status]);
		return result;
	}

	// Update insurance history record
	static async update(policy_id, updates) {
		const fields = [];
		const values = [];

		if (Object.prototype.hasOwnProperty.call(updates, 'premium_amount')) {
			fields.push('premium_amount = ?');
			values.push(updates.premium_amount);
		}
		if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
			fields.push('status = ?');
			values.push(updates.status);
		}
		if (Object.prototype.hasOwnProperty.call(updates, 'risk_score_then')) {
			fields.push('risk_score_then = ?');
			values.push(updates.risk_score_then);
		}

		if (fields.length === 0) return null;

		values.push(policy_id);
		const sql = `UPDATE InsuranceHistory SET ${fields.join(', ')} WHERE policy_id = ?`;
		const [result] = await db.query(sql, values);
		return result;
	}

	// Delete insurance history record
	static async delete(policy_id) {
		const sql = 'DELETE FROM InsuranceHistory WHERE policy_id = ?';
		const [result] = await db.query(sql, [policy_id]);
		return result;
	}
}

module.exports = InsuranceHistoryModel;
