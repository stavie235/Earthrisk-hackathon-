const path = require('path');
const fs = require('fs').promises;
const csv = require('csv-parser');
const { Readable } = require('stream');
const Building = require('../models/buildingModel');
const db = require('../config/db');

const SEED_DATA_PATH = path.join(__dirname, '../../database/sample_data/buildings_seed.json');

const resetbuildings = async (req, res, next) => {
    let connection;
    try {
        const rawData = await fs.readFile(SEED_DATA_PATH, 'utf-8');
        const buildings = JSON.parse(rawData);

        connection = await db.getConnection();
        await connection.beginTransaction();

        await Building.deleteAll(connection);

        for (const entry of buildings) {
            await Building.create(entry, connection);
        }

        await connection.commit();

        return res.status(200).json({
            status: 'OK',
            message: `Data reset to initial state. ${buildings.length} buildings loaded.`
        });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

// Expected CSV columns:
// building_name,address,latitude,longitude,postal_code,building_type,year_built,
// floors,area_sqm,construction_material,flood_zone,earthquake_zone,fire_risk,
// proximity_to_water,elevation_m,risk_score
const addbuildings = async (req, res, next) => {
    if (!req.file) {
        res.status(400);
        return next(new Error('No file uploaded'));
    }

    if (req.file.mimetype !== 'text/csv') {
        res.status(400);
        return next(new Error("Invalid file type. Only 'text/csv' is supported."));
    }

    let connection;
    try {
        const rows = [];
        const stream = Readable.from(req.file.buffer.toString());

        await new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        connection = await db.getConnection();
        await connection.beginTransaction();

        for (const row of rows) {
            await Building.create(row, connection);
        }

        await connection.commit();
        return res.status(200).json({
            status: 'OK',
            message: `Successfully imported ${rows.length} buildings.`
        });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { resetbuildings, addbuildings };
