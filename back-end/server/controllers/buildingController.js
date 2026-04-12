const BuildingModel = require('../models/buildingModel');
const { spawn } = require('child_process');
const path = require('path');

const ML_SCRIPT  = path.join(__dirname, '../../../ml-model/predict.py');
const ML_PYTHON  = path.join(__dirname, '../../../insurance-risk-agents/.venv/Scripts/python.exe');

const getAllBuildings = async (req, res, next) => {
    try {
        // If any filter query params are present, delegate to search
        const hasFilters = ['q', 'building_type', 'risk_min', 'risk_max',
                            'flood_zone', 'earthquake_zone', 'risk_category', 'postal_code']
                           .some(k => req.query[k] !== undefined);

        if (hasFilters) {
            return searchBuildings(req, res, next);
        }

        const buildings = await BuildingModel.getAll();
        res.status(200).json(buildings);
    } catch (error) {
        next(error);
    }
};

const getBuilding = async (req, res, next) => {
    try {
        const { id } = req.params;
        const building = await BuildingModel.getById(id);

        if (!building) {
            res.status(404);
            return next(new Error('Building not found.'));
        }

        res.status(200).json(building);
    } catch (error) {
        next(error);
    }
};

const searchBuildings = async (req, res, next) => {
    try {
        const filters = {
            q: req.query.q,
            building_type: req.query.building_type ? req.query.building_type.split(',') : [],
            risk_min: req.query.risk_min !== undefined ? req.query.risk_min : null,
            risk_max: req.query.risk_max !== undefined ? req.query.risk_max : null,
            flood_zone: req.query.flood_zone ? req.query.flood_zone.split(',') : [],
            earthquake_zone: req.query.earthquake_zone ? req.query.earthquake_zone.split(',') : [],
            risk_category: req.query.risk_category ? req.query.risk_category.split(',') : [],
            postal_code: req.query.postal_code
        };

        const buildings = await BuildingModel.search(filters);
        res.status(200).json(buildings);
    } catch (error) {
        next(error);
    }
};

const getBuildingByExternalId = async (req, res, next) => {
    try {
        const { externalId } = req.params;
        const building = await BuildingModel.getByExternalId(externalId);

        if (!building) {
            res.status(404);
            return next(new Error(`Building with external ID ${externalId} not found.`));
        }

        res.status(200).json(building);
    } catch (error) {
        next(error);
    }
};

const getBuildingHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const building = await BuildingModel.getById(id);

        if (!building) {
            res.status(404);
            return next(new Error('Building not found.'));
        }

        const history = await BuildingModel.getHistory(id);
        res.status(200).json(history);
    } catch (error) {
        next(error);
    }
};

const getUserBuildings = async (req, res, next) => {
    try {
        const user_id = req.user_id;
        const hasFilters = ['q', 'building_type', 'risk_min', 'risk_max',
                            'flood_zone', 'earthquake_zone', 'risk_category', 'postal_code']
                           .some(k => req.query[k] !== undefined);

        const filters = hasFilters ? {
            q: req.query.q,
            building_type: req.query.building_type ? req.query.building_type.split(',') : [],
            risk_min: req.query.risk_min !== undefined ? req.query.risk_min : null,
            risk_max: req.query.risk_max !== undefined ? req.query.risk_max : null,
            flood_zone: req.query.flood_zone ? req.query.flood_zone.split(',') : [],
            earthquake_zone: req.query.earthquake_zone ? req.query.earthquake_zone.split(',') : [],
            risk_category: req.query.risk_category ? req.query.risk_category.split(',') : [],
            postal_code: req.query.postal_code
        } : {};

        const buildings = await BuildingModel.getByUserScope(user_id, filters);
        res.status(200).json(buildings);
    } catch (error) {
        next(error);
    }
};

const getBuildingPrediction = (req, res, next) => {
    const { id } = req.params;

    BuildingModel.getById(id).then(building => {
        if (!building) {
            res.status(404);
            return next(new Error('Building not found.'));
        }

        const py = spawn(ML_PYTHON, [ML_SCRIPT]);
        let stdout = '';
        let stderr = '';

        py.stdout.on('data', chunk => { stdout += chunk; });
        py.stderr.on('data', chunk => { stderr += chunk; });

        py.on('close', code => {
            if (code !== 0 || !stdout) {
                return next(new Error(`ML prediction failed: ${stderr.slice(0, 200)}`));
            }
            try {
                res.status(200).json(JSON.parse(stdout));
            } catch {
                next(new Error('ML script returned invalid JSON'));
            }
        });

        py.stdin.write(JSON.stringify(building));
        py.stdin.end();
    }).catch(next);
};

module.exports = { getAllBuildings, getBuilding, searchBuildings, getBuildingByExternalId, getBuildingHistory, getUserBuildings, getBuildingPrediction };
