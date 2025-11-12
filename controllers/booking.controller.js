const { Booking, User, Space ,Kyc } = require('../models');
const sendMail = require('../utils/helper');



const bookingController = {} ;

//create boooking 
bookingController.createBooking = async (req, res) => {
  try {
    const { spaceId, date, startDate, endDate, amount } = req.body;
    
    const booking = await Booking.create({
      userId: req.user.id,
      spaceId,
      date,
      startDate,
      endDate,
      amount,
      status: "Pending"
    });
    
    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
//upload payment screenshots
bookingController.uploadPayment = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

  // Save screenshot path (use web-accessible uploads path for consistency)
  booking.paymentScreenshot = `/uploads/payment-screenshots/${req.file.filename}`;
  // Do NOT auto-confirm the booking here. Keep status as 'Pending' so admin can verify and confirm.
  await booking.save();

    // Send email to admin
    await sendMail("info@cohopers.in", "New Booking Payment Received",
      `A user has uploaded payment screenshot for booking ID: ${booking.id}`);

  // Notify admin that a payment has been submitted and is awaiting verification
  res.json({ message: "Payment uploaded successfully and is pending admin verification", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//kyc submit for specific role
bookingController.submitKyc = async (req, res) => {
  try {
    const { type, name, email, mobile, companyName, gstNumber, directorName, din } = req.body;
    const bookingId = req.params.id;

    // Use authenticated user as KYC owner
    const userId = req.user.id;

    let kycData = {
      userId,
      type,
      name,
      email,
      mobile,
      gstNumber,
      companyName,
      directorName,
      din,
    };

    // Handle file uploads
    if (req.files) {
      // Freelancer
      if (req.files["idFront"]) kycData.idFront = req.files["idFront"][0].path;
      if (req.files["idBack"]) kycData.idBack = req.files["idBack"][0].path;
      if (req.files["pan"]) kycData.pan = req.files["pan"][0].path;
      if (req.files["photo"]) kycData.photo = req.files["photo"][0].path;

      // Company
      if (req.files["certificateOfIncorporation"]) kycData.certificateOfIncorporation = req.files["certificateOfIncorporation"][0].path;
      if (req.files["companyPAN"]) kycData.companyPAN = req.files["companyPAN"][0].path;

      // Director
      if (req.files["directorPAN"]) kycData.directorPAN = req.files["directorPAN"][0].path;
      if (req.files["directorPhoto"]) kycData.directorPhoto = req.files["directorPhoto"][0].path;
      if (req.files["directorIdFront"]) kycData.directorIdFront = req.files["directorIdFront"][0].path;
      if (req.files["directorIdBack"]) kycData.directorIdBack = req.files["directorIdBack"][0].path;
      if (req.files["directorPaymentProof"]) kycData.directorPaymentProof = req.files["directorPaymentProof"][0].path;
    }

    const kyc = await Kyc.create(kycData);

    //  Send Email to Admin
    await sendMail(
      "info@cohopers.in",
      "New KYC Submission",
      `A user has submitted ${type} KYC for user ID: ${userId}`
    );

    res.json({ message: "KYC submitted successfully", kyc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//get booking details
bookingController.getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
  { model: Space, as: "space" },
  { model: User, as: "user" },
  { model: Kyc, as: "kyc" }  
]
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
module.exports = bookingController;