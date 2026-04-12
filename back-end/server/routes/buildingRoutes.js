const express = require('express');
const router = express.Router();
const buildingController = require('../controllers/buildingController');
const verifyToken = require('../middleware/authToken');

router.get('/my', verifyToken, buildingController.getUserBuildings);
router.get('/search', buildingController.searchBuildings);
router.get('/external/:externalId', buildingController.getBuildingByExternalId);
router.get('/:id/history', buildingController.getBuildingHistory);
router.get('/:id/predict', buildingController.getBuildingPrediction);
router.get('/:id', buildingController.getBuilding);
router.get('/', buildingController.getAllBuildings);

module.exports = router;
