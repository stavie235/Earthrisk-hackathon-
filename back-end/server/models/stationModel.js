const db = require('../config/db');

class StationModel {
    static async getAllStations() {
    const query = `
        SELECT 
            s.station_id, 
            s.address, 
            s.latitude, 
            s.longitude,
            s.score,
            CASE 
                WHEN SUM(CASE WHEN c.charger_status = 'available' THEN 1 ELSE 0 END) > 0 THEN 'available'
                WHEN SUM(CASE WHEN c.charger_status = 'charging' THEN 1 ELSE 0 END) > 0 THEN 'charging'
                WHEN SUM(CASE WHEN c.charger_status = 'reserved' THEN 1 ELSE 0 END) > 0 THEN 'reserved'
                ELSE 'offline'
            END AS station_status,
            SUM(CASE WHEN c.charger_status = 'available' THEN 1 ELSE 0 END) AS available_chargers,
            COUNT(CASE WHEN c.charger_id IS NOT NULL THEN 1 END) AS total_chargers
        FROM Station s
        LEFT JOIN Charger c ON s.station_id = c.station_id
        GROUP BY s.station_id
    `;
    
    const [stations] = await db.query(query);
    return stations;
    }

    static async getStationById(id) {
        // We join the Station and Charger tables
        const query = `
            SELECT s.*, c.charger_id, c.power, c.charger_status, c.connector_type, c.current_price
            FROM Station s
            LEFT JOIN Charger c ON s.station_id = c.station_id
            WHERE s.station_id = ?
        `;
        const [rows] = await db.query(query, [id]);

        if (rows.length === 0) return null;

        // Because of the JOIN, we get one row per charger. 
        // We need to format it so chargers are in an array.
        const station = {
            station_id: rows[0].station_id,
            station_name: rows[0].station_name,
            address: rows[0].address,
            facilities: rows[0].facilities,
            latitude: rows[0].latitude,
            longitude: rows[0].longitude,
            score: rows[0].score,
            google_maps_link: rows[0].google_maps_link,
            chargers: rows.filter(r => r.charger_id !== null).map(r => ({
                charger_id: r.charger_id,
                power: r.power,
                charger_status: r.charger_status,
                connector_type: r.connector_type,
                current_price: r.current_price
            }))
        };

        return station;
    }

    static async deleteAll(connection) {
        const conn = connection || db;
        const query = "DELETE FROM Station";
        return conn.query(query);
    }

static async searchStations({ q, power, connector, available, facilities, score }) {
    let queryParams = [];
    let chargerFilters = [];

    if (power?.length) {
      const placeholders = power.map(() => '?').join(', ');
      chargerFilters.push(`ch.power IN (${placeholders})`);
      queryParams.push(...power);
    }

    if (connector?.length) {
      const placeholders = connector.map(() => '?').join(', ');
      chargerFilters.push(`ch.connector_type IN (${placeholders})`);
      queryParams.push(...connector);
    }

    const joinType = chargerFilters.length > 0 ? 'INNER JOIN' : 'LEFT JOIN';

    let queryText = `
      SELECT s.station_id, s.address, s.latitude, s.longitude,
             s.facilities, s.score,
             CASE
               WHEN SUM(CASE WHEN ch.charger_status = 'available' THEN 1 ELSE 0 END) > 0 THEN 'available'
               WHEN SUM(CASE WHEN ch.charger_status = 'charging' THEN 1 ELSE 0 END) > 0 THEN 'charging'
               WHEN SUM(CASE WHEN ch.charger_status = 'reserved' THEN 1 ELSE 0 END) > 0 THEN 'reserved'
               ELSE 'offline'
             END AS station_status,
             SUM(CASE WHEN ch.charger_status = 'available' THEN 1 ELSE 0 END) AS available_chargers,
             COUNT(CASE WHEN ch.charger_id IS NOT NULL THEN 1 END) AS total_chargers
      FROM Station s
      ${joinType} Charger ch ON s.station_id = ch.station_id
      ${chargerFilters.length ? ` AND ${chargerFilters.join(' AND ')}` : ''}
      WHERE 1=1
    `;

    if (q) {
      const searchPattern = `%${q}%`;
      queryText += ` AND (s.address LIKE ? OR s.facilities LIKE ?)`;
      queryParams.push(searchPattern, searchPattern);
    }

    if (facilities?.length) {
      const orConditions = facilities.map(() => 's.facilities LIKE ?').join(' OR ');
      queryText += ` AND (${orConditions})`;
      facilities.forEach(f => queryParams.push(`%${f.trim()}%`));
    }

    if (score?.length) {
      const minScore = Math.min(...score);
      queryText += ` AND s.score >= ?`;
      queryParams.push(minScore);
    }

    queryText += ` GROUP BY s.station_id`;

    if (available === true) {
      queryText += ` HAVING SUM(CASE WHEN ch.charger_status = 'available' THEN 1 ELSE 0 END) > 0`;
    }

    const [rows] = await db.query(queryText, queryParams);
    return rows;
  }

    static async create(stationData, connection) {
        const conn = connection || db;
        const query = `
            INSERT INTO Station (station_id, station_name, address, longitude, latitude, postal_code, facilities, google_maps_link, score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            stationData.station_id,
            stationData.station_name,
            stationData.address,
            stationData.longitude,
            stationData.latitude,
            stationData.postal_code,
            stationData.facilities,
            stationData.google_maps_link,
            stationData.score
        ];

        return conn.query(query, params);
    }

    static async delete(station_id) {
        const query = "DELETE FROM Station WHERE station_id = ?";
        const [result] = await db.query(query, [station_id]);
        return result;
    }
};

module.exports = StationModel;
