const express = require('express');
const router = express.Router();
const adminStatsController = require('../controllers/adminStatsController'); 
const verifyAdmin = require('../middleware/authAdmin');
const verifyToken = require('../middleware/authToken');

router.get('/charts', verifyToken, verifyAdmin, adminStatsController.chartData);
router.get('/buildingHistory', verifyToken, verifyAdmin, adminStatsController.buildingHistory);
router.get('/portfolio', adminStatsController.portfolioStats);

module.exports = router;