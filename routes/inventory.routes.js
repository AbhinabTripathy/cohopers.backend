const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const authMiddleware = require('../middlewares/authAdminMiddleware');

//public routes
router.get('/spaces', inventoryController.getAllSpaces);
router.get('/spaces/:id', inventoryController.getSpaceById);
// procted route only for ADMIN 
router.post('/spaces', authMiddleware,inventoryController.uploadSpaceImages, inventoryController.addSpace);
router.put('/spaces/:id', authMiddleware,inventoryController.uploadSpaceImages, inventoryController.updateSpace);
router.delete('/spaces/:id', authMiddleware,inventoryController.deleteSpace);

module.exports = router;