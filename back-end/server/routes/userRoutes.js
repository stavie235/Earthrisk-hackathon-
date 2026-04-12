const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const insuranceController = require('../controllers/insuranceController'); 
const verifyToken = require('../middleware/authToken');


router.get('/profile', verifyToken, userController.getUserProfile);
router.put('/profile', verifyToken, userController.updateUserProfile);
router.get('/userdata', verifyToken, userController.getUserData);

// Insurance and Climate endpoints
router.get('/insurance-history', verifyToken, insuranceController.getUserInsuranceHistory);
router.get('/insurance-climate-timeline', verifyToken, insuranceController.getUserInsuranceAndClimateTimeline);
router.get('/building/:building_id/insurance-history', verifyToken, insuranceController.getBuildingInsuranceHistory);
router.get('/building/:building_id/climate-history', verifyToken, insuranceController.getBuildingClimateHistory);

module.exports = router;
