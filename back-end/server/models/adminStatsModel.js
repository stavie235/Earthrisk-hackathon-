const db = require('../config/db');

class AdminStatsModel {
    static async countByType() {
        const [rows] = await db.query(`
            SELECT building_type, COUNT(*) AS count
            FROM Building
            GROUP BY building_type
            ORDER BY count DESC
        `);
        return rows;
    }

    static async countByRiskCategory() {
        const [rows] = await db.query(`
            SELECT risk_category, COUNT(*) AS count
            FROM Building
            GROUP BY risk_category
            ORDER BY FIELD(risk_category, 'very_low', 'low', 'medium', 'high', 'very_high')
        `);
        return rows;
    }

    static async avgRiskByFloodZone() {
        const [rows] = await db.query(`
            SELECT flood_zone, ROUND(AVG(risk_score), 2) AS avg_risk_score, COUNT(*) AS count
            FROM Building
            GROUP BY flood_zone
            ORDER BY FIELD(flood_zone, 'none', 'low', 'medium', 'high')
        `);
        return rows;
    }

    static async avgRiskByEarthquakeZone() {
        const [rows] = await db.query(`
            SELECT earthquake_zone, ROUND(AVG(risk_score), 2) AS avg_risk_score, COUNT(*) AS count
            FROM Building
            GROUP BY earthquake_zone
            ORDER BY FIELD(earthquake_zone, 'none', 'low', 'medium', 'high')
        `);
        return rows;
    }

    static async userGrowth() {
        const [rows] = await db.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS new_users
            FROM Users
            GROUP BY month
            ORDER BY month ASC
            LIMIT 12
        `);
        return rows;
    }

    static async buildingHistory() {
        const [rows] = await db.query(`
            SELECT 
                b.building_id,
                b.building_name,
                b.address,
                bh.record_year,
                bh.annual_premium_euro,
                bh.risk_score,
                bh.actual_value_euro,
                bh.nasa_avg_temp_c,
                bh.building_age
            FROM BuildingHistory bh
            JOIN Building b ON bh.building_id = b.building_id
            ORDER BY b.building_id ASC, bh.record_year ASC
        `);
        return rows;
    }
}

module.exports = AdminStatsModel;
