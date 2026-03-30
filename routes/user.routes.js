const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const adminController = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/authUserMiddleware");
const upload = require("../middlewares/upload.middleware");

router.post("/register", userController.register);
router.post("/login", userController.login);

// Push notification endpoints
router.post("/push/register", authMiddleware, userController.registerPushToken);
router.post(
  "/push/subscribe",
  authMiddleware,
  userController.subscribePushTopic,
);
router.post(
  "/push/unsubscribe",
  authMiddleware,
  userController.unsubscribePushTopic,
);

// Dashboard routes
router.get(
  "/dashboard/membership",
  authMiddleware,
  userController.getMembershipDetails,
);
router.get(
  "/dashboard/bookings",
  authMiddleware,
  userController.getUserBookings,
);
router.get(
  "/dashboard/room-bookings",
  authMiddleware,
  userController.getUserRoomBookings,
);

// User history endpoint - combines all booking and payment history
router.get("/history", authMiddleware, userController.getUserHistory);

router.get("/profile", authMiddleware, userController.getUserProfile);
// Update profile (supports profile photo upload)
router.put(
  "/profile",
  authMiddleware,
  upload("kyc").single("profilePhoto"),
  userController.updateUserProfile,
);

//same for all user put the token of user in bearer token and that will be logout
router.get("/logout", userController.logout);

module.exports = router;
