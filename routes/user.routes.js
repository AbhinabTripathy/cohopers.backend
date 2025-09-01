const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const adminController = require('../controllers/admin.controller');

router.post('/register',userController.register);
router.post('/login' , userController.login);

module.exports = router;