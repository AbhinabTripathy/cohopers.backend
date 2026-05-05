const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const adminController = require("../controllers/admin.controller");
const bookingController = require("../controllers/booking.controller");
const authMiddleware = require("../middlewares/authUserMiddleware");
const upload = require("../middlewares/upload.middleware");

router.post("/register", userController.register);
router.post("/login", userController.login);

// Visitor (cafeteria/utility website) routes
router.post(
  "/visitor/register",
  upload("id-proofs").single("idProof"),
  userController.visitorRegister,
);
router.post("/visitor/login", userController.visitorLogin);

// Visitor KYC submission
router.post(
  "/visitor/kyc",
  authMiddleware,
  upload("kyc").fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "certificateOfIncorporation", maxCount: 1 },
    { name: "companyPAN", maxCount: 1 },
    { name: "directorPAN", maxCount: 1 },
    { name: "directorPhoto", maxCount: 1 },
    { name: "directorIdFront", maxCount: 1 },
    { name: "directorIdBack", maxCount: 1 },
    { name: "directorPaymentProof", maxCount: 1 },
  ]),
  bookingController.submitKyc,
);

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

// Order history endpoint - combines cafeteria and utility order history
router.get("/order-history", authMiddleware, userController.getOrderHistory);

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
