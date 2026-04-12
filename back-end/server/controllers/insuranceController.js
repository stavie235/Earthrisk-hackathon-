const InsuranceHistoryModel = require('../models/insuranceHistoryModel');
const ClimateLogsModel = require('../models/climateLogsModel');
const BuildingModel = require('../models/buildingModel');

// Get user's insurance history
const getUserInsuranceHistory = async (req, res, next) => {
	try {
		const user_id = req.user_id;
		const insuranceHistory = await InsuranceHistoryModel.getByUserId(user_id);

		if (!insuranceHistory || insuranceHistory.length === 0) {
			return res.status(200).json([]);
		}

		res.status(200).json(insuranceHistory);
	} catch (error) {
		next(error);
	}
};

// Get insurance history for specific building
const getBuildingInsuranceHistory = async (req, res, next) => {
	try {
		const { building_id } = req.params;
		const insuranceHistory = await InsuranceHistoryModel.getByBuildingId(building_id);

		if (!insuranceHistory || insuranceHistory.length === 0) {
			return res.status(200).json([]);
		}

		res.status(200).json(insuranceHistory);
	} catch (error) {
		next(error);
	}
};

// Get climate logs for a building (via postal code)
const getBuildingClimateHistory = async (req, res, next) => {
	try {
		const { building_id } = req.params;
		const building = await BuildingModel.getById(building_id);

		if (!building) {
			res.status(404);
			return next(new Error("Building not found"));
		}

		const climateLogs = await ClimateLogsModel.getByPostalCode(building.postal_code);

		if (!climateLogs || climateLogs.length === 0) {
			return res.status(200).json([]);
		}

		res.status(200).json(climateLogs);
	} catch (error) {
		next(error);
	}
};

// Get user's insurance and climate history combined (for timeline)
const getUserInsuranceAndClimateTimeline = async (req, res, next) => {
	try {
		const user_id = req.user_id;
		const insuranceHistory = await InsuranceHistoryModel.getByUserId(user_id);

		if (!insuranceHistory || insuranceHistory.length === 0) {
			return res.status(200).json({ insurance: [], climate: [] });
		}

		// Get unique postal codes from buildings in insurance history
		const postalCodes = [...new Set(insuranceHistory.map(ih => ih.postal_code))];
		
		// Get climate logs for all relevant postal codes
		let climateLogs = [];
		for (const postalCode of postalCodes) {
			const logs = await ClimateLogsModel.getByPostalCode(postalCode);
			climateLogs = [...climateLogs, ...logs];
		}

		res.status(200).json({
			insurance: insuranceHistory,
			climate: climateLogs
		});
	} catch (error) {
		next(error);
	}
};

// Get all climate logs (admin)
const getAllClimateLogs = async (req, res, next) => {
	try {
		const climateLogs = await ClimateLogsModel.getAll();

		if (!climateLogs || climateLogs.length === 0) {
			return res.status(200).json([]);
		}

		res.status(200).json(climateLogs);
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getUserInsuranceHistory,
	getBuildingInsuranceHistory,
	getBuildingClimateHistory,
	getUserInsuranceAndClimateTimeline,
	getAllClimateLogs
};
