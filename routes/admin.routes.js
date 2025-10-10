const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminAuthMiddleware = require('../middlewares/authAdminMiddleware'); 

//admin register 
router.post('/register-admin', adminController.registerAdmin);


//admin login
router.post('/login', adminController.login);
// Get all meeting room bookings
router.get('/meeting-room-bookings', adminController.getAllMeetingRoomBookings);
// Get all space bookings
router.get('/space-bookings', adminAuthMiddleware, adminController.getAllSpaceBookings);

// Verify space booking
router.put('/space-bookings/:id/verify', adminAuthMiddleware, adminController.verifySpaceBooking);

// Dashboard data
router.get('/dashboard-data', adminAuthMiddleware, adminController.getDashboardData);
// for active & past members
router.get('/active-members', adminController.getAllActiveMembers);
router.get('/past-members', adminController.getPastMembers);

module.exports = router;