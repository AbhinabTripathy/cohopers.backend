const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require("../middlewares/authUserMiddleware")


router.post('/register',userController.register);
router.post('/login' , userController.login);

// Dashboard routes
router.get('/dashboard/membership', authMiddleware, userController.getMembershipDetails);
router.get('/dashboard/bookings', authMiddleware, userController.getUserBookings);
router.get('/dashboard/room-bookings', authMiddleware, userController.getUserRoomBookings);

router.get("/profile", authMiddleware, userController.getUserProfile);




//same for all user put the token of user in bearer token and that will be logout
router.get('/logout',userController.logout);



module.exports = router;