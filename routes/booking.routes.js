const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const authUserMiddleware = require("../middlewares/authUserMiddleware");
const upload = require("../middlewares/upload.middleware"); // multer for screenshot upload

router.use(authUserMiddleware);

// User books a space
router.post("/book/space", bookingController.createBooking);

// Upload payment screenshot
router.post("/:id/payment", upload.single("paymentScreenshot"), bookingController.uploadPayment);
//kyc upload for specific role
router.post(
  "/kyc/:id",
  upload.fields([
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
  bookingController.submitKyc
);

//  Get booking details with KYC
router.get("/spaces/:id", bookingController.getBookingDetails);

module.exports = router;
