const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Space management routes
router.post('/spaces', inventoryController.uploadSpaceImages, inventoryController.addSpace);
router.get('/spaces', inventoryController.getAllSpaces);
router.get('/spaces/:id', inventoryController.getSpaceById);
router.put('/spaces/:id', inventoryController.uploadSpaceImages, inventoryController.updateSpace);
router.delete('/spaces/:id', inventoryController.deleteSpace);

module.exports = router;