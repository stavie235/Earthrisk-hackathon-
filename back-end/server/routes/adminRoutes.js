const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/authToken');
const verifyAdmin = require('../middleware/authAdmin');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/resetbuildings', verifyToken, verifyAdmin, adminController.resetbuildings);
router.post('/addbuildings', verifyToken, verifyAdmin, upload.single('file'), adminController.addbuildings);

module.exports = router;
