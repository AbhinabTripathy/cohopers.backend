const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const upload = require("../middlewares/upload.middleware");
const authMemberMiddleware = require("../middlewares/authMemberMiddleware");
const authUserMiddleware = require("../middlewares/authUserMiddleware");

// User books a space (members only)
router.post("/book/space", authMemberMiddleware, bookingController.createBooking);

// Upload payment screenshot (members only)
router.post(
  "/:id/payment",
  authMemberMiddleware,
  upload("payment-screenshots").single("paymentScreenshot"),
  bookingController.uploadPayment,
);

// KYC upload (both members and visitors)
router.post(
  "/kyc",
  authUserMiddleware,
  upload("kyc").fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "paymentScreenshot", maxCount: 1 },
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

//  Get booking details with KYC
router.get("/spaces/:id", bookingController.getBookingDetails);

module.exports = router;
