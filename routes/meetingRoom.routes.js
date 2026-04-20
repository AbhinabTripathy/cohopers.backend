const express = require("express");
const meetingRoomController = require("../controllers/meetingRoom.controller");
const authMiddleware = require("../middlewares/authUserMiddleware");
const authMemberMiddleware = require("../middlewares/authMemberMiddleware");
const authAdminMiddleware = require("../middlewares/authAdminMiddleware");
const fileUpload = require("../middlewares/upload.middleware");

const router = express.Router();

// Public routes for room information
router.get(["/", ""], meetingRoomController.getMeetingRooms);
router.get("/room-types", meetingRoomController.getRoomTypes);
router.get("/booking-types", meetingRoomController.getBookingTypes);
router.get("/member-types", meetingRoomController.getMemberTypes);
router.get("/pricing", meetingRoomController.getRoomPricing);
router.get("/available-slots", meetingRoomController.getAvailableTimeSlots);
router.get("/available-days", meetingRoomController.getAvailableDays);
router.get("/amenities", meetingRoomController.getAmenities);
router.post(
  "/add",
  authAdminMiddleware,
  fileUpload("meeting-rooms").single("image"),
  meetingRoomController.addMeetingRoom
);
router.put(
  "/:id",
  authAdminMiddleware,
  fileUpload("meeting-rooms").single("image"),
  meetingRoomController.updateMeetingRoom
);
router.delete(
  "/:id",
  authAdminMiddleware,
  meetingRoomController.deleteMeetingRoom
);
router.post(
  "/book",
  authMemberMiddleware,
  fileUpload("meeting-rooms").fields([
    { name: "paymentScreenshot", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "coi", maxCount: 1 },
  ]),
  meetingRoomController.bookRoom,
);
// verify booking
router.put("/verify-booking/:bookingId", meetingRoomController.verifyBooking);

module.exports = router;
