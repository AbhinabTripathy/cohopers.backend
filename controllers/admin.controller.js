const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, MeetingRoom, roomBooking, Space, Booking } = require('../models');
const sequelize = require('../config/db');
const HttpStatus = require('../enums/httpStatusCode.enum');
const sendMail = require("../utils/helper")

const ADMIN_CREDENTIALS = {
    email: 'info@cohopers.in',
    // Store hashed password in production
    password: 'Cohopers@123'
};

const adminController = {}; 
  adminController.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { email: ADMIN_CREDENTIALS.email, role: 'admin' },
            process.env.APP_SUPER_SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { token }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all meeting room bookings for admin panel
adminController.getAllMeetingRoomBookings = async (req, res) => {
  try {
    const bookings = await roomBooking.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "username", "email"]
        },
        {
          model: MeetingRoom,
          attributes: ["id", "name", "capacityType"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Format for admin panel
    const formattedBookings = bookings.map((booking, index) => {
      return {
        sl: index + 1,
        userId: booking.User.id,
        userName: booking.User.username,
        bookingType: booking.bookingType, // Hourly / WholeDay
        memberType: booking.memberType,
        date: booking.bookingDate,
        seatType: booking.MeetingRoom.capacityType,
        slotTiming:
          booking.bookingType === "Hourly"
            ? booking.timeSlots?.join(", ")
            : "Full Day",
        paymentEmail: booking.User.email,
        status: booking.status,
        id: booking.id
      };
    });
  
    res.status(200).json({
      success: true,
      message: "Booked Meeting room retrieved successfully",
      data: formattedBookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve meeting room bookings",
      error: error.message
    });
  }
};


// Get all space bookings for admin panel

adminController.getAllSpaceBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email", "mobile"]
        },
        {
          model: Space,
          as: "space",
          attributes: ["id", "space_name", "roomNumber", "cabinNumber", "seater"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const formattedBookings = bookings.map((booking, index) => ({
      id: booking.id,
      sl: index + 1,
      userId: booking.user.id,
      userName: booking.user.username,
      email: booking.user.email,
      mobile: booking.user.mobile,
      spaceName: booking.space.space_name,
      roomNumber: booking.space.roomNumber,
      cabinNumber: booking.space.cabinNumber,
      seater: booking.space.seater,
      date: booking.date,
      startDate: booking.startDate,
      endDate: booking.endDate,
      amount: booking.amount,
      status: booking.status,
      paymentScreenshot: booking.paymentScreenshot,
    }));

    res.status(200).json({
      success: true,
      message: "Space bookings retrieved successfully",
      data: formattedBookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve space bookings",
      error: error.message
    });
  }
};



// Verify space booking
adminController.verifySpaceBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!id) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Booking ID is required"
      });
    }

    if (!status || !["Confirm", "Rejected"].includes(status)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Valid status (Confirm/Rejected) is required"
      });
    }

    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: User,
          as:"user",
          attributes: ["id", "userName", "email"]
        },
        {
          model: Space,
          as:"space",
          attributes: ["id", "space_name", "roomNumber", "cabinNumber"]
        }
      ]
    });

    if (!booking) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: "Booking not found"
      });
    }

    booking.status = status;
    await booking.save();

    // Send email notification to user
    const emailSubject = `Space Booking ${status === "Confirm" ? "Confirmed" : "Rejected"}`;
    const emailMessage = `
      <p>Dear ${booking.user.userName},</p>
      <p>Your booking for ${booking.space.space_name} (Room ${booking.space.roomNumber}${booking.space.cabinNumber}) has been ${status === "Confirm" ? "confirmed" : "rejected"}.</p>
      ${remarks ? `<p>Remarks: ${remarks}</p>` : ''}
      <p>Booking Details:</p>
      <ul>
        <li>Booking ID: ${booking.id}</li>
        <li>Space: ${booking.space.space_name}</li>
        <li>Room: ${booking.space.roomNumber}${booking.space.cabinNumber}</li>
        <li>Date: ${booking.date}</li>
        <li>Start Date: ${booking.startDate}</li>
        <li>End Date: ${booking.endDate}</li>
        <li>Amount: ${booking.amount}</li>
      </ul>
      <p>Thank you for choosing CoHopers!</p>
    `;

    await sendMail(emailSubject, emailMessage);

    res.status(HttpStatus.OK).json({
      success: true,
      message: `Booking ${status === "Confirm" ? "confirmed" : "rejected"} successfully`,
      data: booking
    });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to verify booking",
      error: error.message
    });
  }
};
module.exports = adminController;