const express = require('express');
const router  = express.Router();
const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// In-memory cache — parquet doesn't change at runtime
let cachedBuildings = null;

async function loadBuildings() {
    if (cachedBuildings) return cachedBuildings;
    const { data } = await axios.get(`${ML_API_URL}/buildings`);
    cachedBuildings = data;
    return cachedBuildings;
}

// GET /api/ml-buildings — all buildings
router.get('/', async (req, res, next) => {
    try {
        const buildings = await loadBuildings();
        res.json(buildings);
    } catch (err) {
        next(err);
    }
});

// GET /api/ml-buildings/:id/predict — run ML models on a parquet building
router.get('/:id/predict', async (req, res, next) => {
    try {
        const buildings = await loadBuildings();
        const building = buildings.find(b => b.building_id === req.params.id);
        if (!building) {
            res.status(404);
            return next(new Error(`ML building ${req.params.id} not found.`));
        }

        const { data: prediction } = await axios.post(`${ML_API_URL}/predict`, building);
        res.json(prediction);
    } catch (err) {
        next(err);
    }
});

// GET /api/ml-buildings/:id — single building by building_id
router.get('/:id', async (req, res, next) => {
    try {
        const buildings = await loadBuildings();
        const building = buildings.find(b => b.building_id === req.params.id);
        if (!building) {
            res.status(404);
            return next(new Error(`ML building ${req.params.id} not found.`));
        }
        res.json(building);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
