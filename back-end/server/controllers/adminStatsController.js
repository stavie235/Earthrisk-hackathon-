const AdminStatsModel = require('../models/adminStatsModel');

const chartData = async (req, res, next) => {
    try {
        const [byType, byRiskCategory, byFloodZone, byEarthquakeZone, userGrowth] = await Promise.all([
            AdminStatsModel.countByType(),
            AdminStatsModel.countByRiskCategory(),
            AdminStatsModel.avgRiskByFloodZone(),
            AdminStatsModel.avgRiskByEarthquakeZone(),
            AdminStatsModel.userGrowth()
        ]);

        res.status(200).json({
            byType,
            byRiskCategory,
            byFloodZone,
            byEarthquakeZone,
            userGrowth
        });
    } catch (error) {
        next(error);
    }
};

const buildingHistory = async (req, res, next) => {
    try {
        const rows = await AdminStatsModel.buildingHistory();

        // build list of unique buildings and map by record
        const buildings = [];
        const buildingMap = new Map();

        rows.forEach((row) => {
            if (!buildingMap.has(row.building_id)) {
                const item = {
                    building_id: row.building_id,
                    building_name: row.building_name,
                    address: row.address
                };
                buildingMap.set(row.building_id, item);
                buildings.push(item);
            }
        });

        res.status(200).json({
            buildings,
            history: rows
        });
    } catch (error) {
        next(error);
    }
};

const portfolioStats = async (_req, res, next) => {
    try {
        const [byType, byRiskCategory, byFloodZone, byEarthquakeZone] = await Promise.all([
            AdminStatsModel.countByType(),
            AdminStatsModel.countByRiskCategory(),
            AdminStatsModel.avgRiskByFloodZone(),
            AdminStatsModel.avgRiskByEarthquakeZone(),
        ]);

        res.status(200).json({
            byType,
            byRiskCategory,
            avg_risk_by_flood_zone: byFloodZone,
            avg_risk_by_earthquake_zone: byEarthquakeZone,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { chartData, buildingHistory, portfolioStats };
