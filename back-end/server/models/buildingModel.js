const db = require('../config/db');

class BuildingModel {
    static async getAll() {
        const query = `
            SELECT
                building_id, external_id, building_name, address,
                latitude, longitude, postal_code, google_maps_link,
                building_type, year_built, floors, area_sqm, construction_material,
                flood_zone, earthquake_zone, fire_risk,
                proximity_to_water, elevation_m,
                prefecture, crime_rate, near_nature,
                has_alarm, has_cameras, has_security_door,
                typos, coverage_scope, coverage_level, deductible_euro, underinsured,
                annual_premium_euro, actual_value_euro, declared_value_euro, nasa_avg_temp_c,
                risk_score, risk_category,
                created_at, updated_at
            FROM Building
            ORDER BY risk_score DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async getById(id) {
        const query = `
            SELECT
                building_id, external_id, building_name, address,
                latitude, longitude, postal_code, google_maps_link,
                building_type, year_built, floors, area_sqm, construction_material,
                flood_zone, earthquake_zone, fire_risk,
                proximity_to_water, elevation_m,
                prefecture, crime_rate, near_nature,
                has_alarm, has_cameras, has_security_door,
                typos, coverage_scope, coverage_level, deductible_euro, underinsured,
                annual_premium_euro, actual_value_euro, declared_value_euro, nasa_avg_temp_c,
                risk_score, risk_category,
                created_at, updated_at
            FROM Building
            WHERE building_id = ?
        `;
        const [rows] = await db.query(query, [id]);
        return rows[0] || null;
    }

    static async getByUserScope(user_id, { q, building_type, risk_min, risk_max, flood_zone, earthquake_zone, risk_category, postal_code } = {}) {
        let queryText = `
            SELECT DISTINCT
                b.building_id, b.external_id, b.building_name, b.address,
                b.latitude, b.longitude, b.postal_code, b.google_maps_link,
                b.building_type, b.year_built, b.floors, b.area_sqm, b.construction_material,
                b.flood_zone, b.earthquake_zone, b.fire_risk,
                b.proximity_to_water, b.elevation_m,
                b.prefecture, b.crime_rate, b.near_nature,
                b.has_alarm, b.has_cameras, b.has_security_door,
                b.typos, b.coverage_scope, b.coverage_level, b.deductible_euro, b.underinsured,
                b.annual_premium_euro, b.actual_value_euro, b.declared_value_euro, b.nasa_avg_temp_c,
                b.risk_score, b.risk_category,
                b.created_at, b.updated_at
            FROM Building b
            INNER JOIN InsuranceHistory ih ON b.building_id = ih.building_id
            WHERE ih.user_id = ?
        `;
        const queryParams = [user_id];

        if (q) {
            queryText += ` AND (b.building_name LIKE ? OR b.address LIKE ?)`;
            queryParams.push(`%${q}%`, `%${q}%`);
        }
        if (building_type?.length) {
            const placeholders = building_type.map(() => '?').join(', ');
            queryText += ` AND b.building_type IN (${placeholders})`;
            queryParams.push(...building_type);
        }
        if (risk_min !== undefined && risk_min !== null) {
            queryText += ` AND b.risk_score >= ?`;
            queryParams.push(Number(risk_min));
        }
        if (risk_max !== undefined && risk_max !== null) {
            queryText += ` AND b.risk_score <= ?`;
            queryParams.push(Number(risk_max));
        }
        if (flood_zone?.length) {
            const placeholders = flood_zone.map(() => '?').join(', ');
            queryText += ` AND b.flood_zone IN (${placeholders})`;
            queryParams.push(...flood_zone);
        }
        if (earthquake_zone?.length) {
            const placeholders = earthquake_zone.map(() => '?').join(', ');
            queryText += ` AND b.earthquake_zone IN (${placeholders})`;
            queryParams.push(...earthquake_zone);
        }
        if (risk_category?.length) {
            const placeholders = risk_category.map(() => '?').join(', ');
            queryText += ` AND b.risk_category IN (${placeholders})`;
            queryParams.push(...risk_category);
        }
        if (postal_code) {
            queryText += ` AND b.postal_code = ?`;
            queryParams.push(Number(postal_code));
        }

        queryText += ` ORDER BY b.risk_score DESC`;
        const [rows] = await db.query(queryText, queryParams);
        return rows;
    }

    static async search({ q, building_type, risk_min, risk_max, flood_zone, earthquake_zone, risk_category, postal_code }) {
        let queryText = `
            SELECT
                building_id, external_id, building_name, address,
                latitude, longitude, postal_code, google_maps_link,
                building_type, year_built, floors, area_sqm, construction_material,
                flood_zone, earthquake_zone, fire_risk,
                proximity_to_water, elevation_m,
                prefecture, crime_rate, near_nature,
                has_alarm, has_cameras, has_security_door,
                typos, coverage_scope, coverage_level, deductible_euro, underinsured,
                annual_premium_euro, actual_value_euro, declared_value_euro, nasa_avg_temp_c,
                risk_score, risk_category,
                created_at, updated_at
            FROM Building
            WHERE 1=1
        `;
        const queryParams = [];

        if (q) {
            queryText += ` AND (building_name LIKE ? OR address LIKE ?)`;
            queryParams.push(`%${q}%`, `%${q}%`);
        }

        if (building_type?.length) {
            const placeholders = building_type.map(() => '?').join(', ');
            queryText += ` AND building_type IN (${placeholders})`;
            queryParams.push(...building_type);
        }

        if (risk_min !== undefined && risk_min !== null) {
            queryText += ` AND risk_score >= ?`;
            queryParams.push(Number(risk_min));
        }

        if (risk_max !== undefined && risk_max !== null) {
            queryText += ` AND risk_score <= ?`;
            queryParams.push(Number(risk_max));
        }

        if (flood_zone?.length) {
            const placeholders = flood_zone.map(() => '?').join(', ');
            queryText += ` AND flood_zone IN (${placeholders})`;
            queryParams.push(...flood_zone);
        }

        if (earthquake_zone?.length) {
            const placeholders = earthquake_zone.map(() => '?').join(', ');
            queryText += ` AND earthquake_zone IN (${placeholders})`;
            queryParams.push(...earthquake_zone);
        }

        if (risk_category?.length) {
            const placeholders = risk_category.map(() => '?').join(', ');
            queryText += ` AND risk_category IN (${placeholders})`;
            queryParams.push(...risk_category);
        }

        if (postal_code) {
            queryText += ` AND postal_code = ?`;
            queryParams.push(Number(postal_code));
        }

        queryText += ` ORDER BY risk_score DESC`;

        const [rows] = await db.query(queryText, queryParams);
        return rows;
    }

    static async create(data, connection) {
        const conn = connection || db;
        const query = `
            INSERT INTO Building (
                building_name, address, latitude, longitude, postal_code, google_maps_link,
                building_type, year_built, floors, area_sqm, construction_material,
                flood_zone, earthquake_zone, fire_risk,
                proximity_to_water, elevation_m, risk_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.building_name || null,
            data.address,
            data.latitude,
            data.longitude,
            data.postal_code || null,
            data.google_maps_link || null,
            data.building_type,
            data.year_built || null,
            data.floors || null,
            data.area_sqm || null,
            data.construction_material || 'concrete',
            data.flood_zone || 'none',
            data.earthquake_zone || 'none',
            data.fire_risk || 'low',
            data.proximity_to_water || null,
            data.elevation_m || null,
            data.risk_score || 0.00
        ];
        return conn.query(query, params);
    }

    static async deleteAll(connection) {
        const conn = connection || db;
        return conn.query('DELETE FROM Building');
    }

    static async delete(building_id) {
        const [result] = await db.query('DELETE FROM Building WHERE building_id = ?', [building_id]);
        return result;
    }

    static async getByExternalId(externalId) {
        const query = `
            SELECT
                building_id, external_id, building_name, address,
                latitude, longitude, postal_code, google_maps_link,
                building_type, year_built, floors, area_sqm, construction_material,
                flood_zone, earthquake_zone, fire_risk,
                proximity_to_water, elevation_m,
                prefecture, crime_rate, near_nature,
                has_alarm, has_cameras, has_security_door,
                typos, coverage_scope, coverage_level, deductible_euro, underinsured,
                annual_premium_euro, actual_value_euro, declared_value_euro, nasa_avg_temp_c,
                risk_score, risk_category,
                created_at, updated_at
            FROM Building
            WHERE external_id = ?
        `;
        const [rows] = await db.query(query, [externalId.toUpperCase()]);
        return rows[0] || null;
    }

    static async getHistory(buildingId) {
        const query = `
            SELECT
                bh.history_id, bh.building_id, bh.record_year,
                bh.risk_score, bh.annual_premium_euro,
                bh.actual_value_euro, bh.nasa_avg_temp_c, bh.building_age
            FROM BuildingHistory bh
            WHERE bh.building_id = ?
            ORDER BY bh.record_year ASC
        `;
        const [rows] = await db.query(query, [buildingId]);
        return rows;
    }
}

module.exports = BuildingModel;
