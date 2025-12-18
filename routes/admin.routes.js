const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminAuthMiddleware = require('../middlewares/authAdminMiddleware');
const upload = require('../middlewares/upload.middleware');

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

// Verify KYC
router.put('/kyc/:id/verify', adminAuthMiddleware, adminController.verifyKyc);

// Get all KYC records (with user + booking details)
router.get('/kyc', adminController.getAllKyc);

// Get single KYC record by id
router.get('/kyc/:id', adminAuthMiddleware, adminController.getKycById);

// Notice period endpoints
router.post('/booking/:id/submit-notice', adminAuthMiddleware, upload('notice-pdfs').single('noticePdf'), adminController.submitNotice);
router.get('/bookings/pending-notice', adminAuthMiddleware, adminController.getBookingsPendingNotice);
router.get('/bookings/active-notice', adminAuthMiddleware, adminController.getNoticeActiveBookings);

module.exports = router;
