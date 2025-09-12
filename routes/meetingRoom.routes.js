const express = require("express");
const meetingRoomController = require("../controllers/meetingRoom.controller");
const authMiddleware = require("../middlewares/authUserMiddleware");
const fileUpload = require("../middlewares/upload.middleware");

const router = express.Router();

// Public routes for room information
router.get("/room-types", meetingRoomController.getRoomTypes);
router.get("/booking-types", meetingRoomController.getBookingTypes);
router.get("/member-types", meetingRoomController.getMemberTypes);
router.get("/pricing", meetingRoomController.getRoomPricing);
router.get("/available-slots", meetingRoomController.getAvailableTimeSlots);
router.get("/amenities", meetingRoomController.getAmenities);

// Protected routes that require authentication
router.post("/book", authMiddleware,  fileUpload.single("paymentScreenshot"), meetingRoomController.bookRoom);
router.put("/verify-booking/:bookingId", meetingRoomController.verifyBooking);

module.exports = router;