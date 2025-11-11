const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {User, Booking, Space, Kyc, teamMember} = require ('../models');
const adminController = require('./admin.controller');
const httpStatus = require("../enums/httpStatusCode.enum");
const responseMessages = require("../enums/responseMessages.enum");

const userController = {};
// User Registration
userController.register = async (req, res) => {
    try {
        const { userName, email, mobile, password, confirmPassword } = req.body;

        // Validate required fields
        if (!userName || !email || !mobile || !password || !confirmPassword) {
            return res.error(
                httpStatus.BAD_REQUEST,
                false,
                "All fields are required"
            );
        }

        // Validate password match
        if (password !== confirmPassword) {
            return res.error(
                httpStatus.BAD_REQUEST,
                false,
                "Passwords do not match"
            );
        }

        // Check if user with email or mobile already exists
        const existingUser = await User.findOne({
            where: { email } // you can add `OR` mobile check here if needed
        });

        if (existingUser) {
            return res.error(
                httpStatus.CONFLICT,
                false,
                "User with this email already exists"
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await User.create({
            username:userName,
            email,
            mobile,
            password: hashedPassword
        });

        // Remove password from response
        const userResponse = newUser.toJSON();
        delete userResponse.password;

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: newUser.id, 
                username: newUser.username,
                role: 'user' 
            },
            process.env.APP_SUPER_SECRET_KEY,
            { expiresIn: '24h' }
        );

        return res.success(
            httpStatus.CREATED,
            true,
            responseMessages.SAVE,
            {
                user: userResponse,
                token
            }
        );

    } catch (error) {
        console.error('User registration error:', error);
        return res.error(
            httpStatus.INTERNAL_SERVER_ERROR,
            false,
            "Error registering user",
            error
        );
    }
};
// User login 
userController.login = async (req, res) => { 
  try { 
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.error(httpStatus.BAD_REQUEST, false, "Mobile number and password are required");
    }

    const user = await User.findOne({ where: { mobile } });
    if (!user) {
      return res.error(httpStatus.UNAUTHORIZED, false, "Invalid mobile number or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.error(httpStatus.UNAUTHORIZED, false, "Invalid mobile number or password");
    }

    // Find KYC by userId (approval is required to login)
    const userKyc = await Kyc.findOne({
      where: { userId: user.id },
      order: [["createdAt", "DESC"]],
    });

    if (!userKyc || userKyc.status !== "Approved") {
      return res.error(
        httpStatus.FORBIDDEN,
        false,
        "KYC pending or not approved. Please complete KYC or wait for admin approval."
      );
    }

    // Check occupied space (confirmed booking)
    const userBooking = await Booking.findOne({
      where: { userId: user.id, status: "Confirm" },
      include: [
        {
          model: require("../models/space.model"),
          as: "space",
          attributes: ["id", "space_name", "roomNumber", "cabinNumber"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const occupiedSpace = userBooking && userBooking.space
      ? {
          id: userBooking.space.id,
          name: userBooking.space.space_name,
          roomNumber: userBooking.space.roomNumber,
          cabinNumber: userBooking.space.cabinNumber,
        }
      : null;

    const memberType = occupiedSpace ? "member" : "non-member";

    const userResponse = user.toJSON();
    delete userResponse.password;

    const token = jwt.sign(
      { id: user.id, username: user.username, role: "user" },
      process.env.APP_SUPER_SECRET_KEY,
      { expiresIn: "24h" }
    );

    return res.success(httpStatus.OK, true, "Login successful", {
      user: userResponse,
      token,
      memberType,
      kycRequired: false
    });
  } catch (error) {
    console.error("User login error:", error);
    return res.error(httpStatus.INTERNAL_SERVER_ERROR, false, "Error during login", error);
  }
};


// Get user's membership details
userController.getMembershipDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find the user's most recent confirmed booking
        const latestBooking = await Booking.findOne({
            where: {
                userId,
                status: "Confirm"
            },
            order: [['createdAt', 'DESC']]
        });
        
        if (!latestBooking) {
            return res.success(
                httpStatus.OK,
                true,
                "No active membership found",
                {
                    valid_until: null,
                    days_remaining: 0,
                    status: "Inactive"
                }
            );
        }
        
        // Calculate membership validity (assuming 30 days from booking date)
        const bookingDate = new Date(latestBooking.date);
        const validUntil = new Date(bookingDate);
        validUntil.setDate(validUntil.getDate() + 30); // 30 days membership
        
        // Calculate days remaining
        const today = new Date();
        const daysRemaining = Math.max(0, Math.ceil((validUntil - today) / (1000 * 60 * 60 * 24)));
        
        // Determine membership status
        const status = daysRemaining > 0 ? "Active" : "Expired";
        
        return res.success(
            httpStatus.OK,
            true,
            "Membership details fetched",
            {
                valid_until: validUntil.toISOString().split('T')[0], // Format as YYYY-MM-DD
                days_remaining: daysRemaining,
                status: status
            }
        );
        
    } catch (error) {
        console.error('Error fetching membership details:', error);
        return res.error(
            httpStatus.INTERNAL_SERVER_ERROR,
            false,
            "Error fetching membership details",
            error
        );
    }
};

// Get user's space booking history
userController.getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find all bookings for the user
        const bookings = await Booking.findAll({
            where: { userId },
            include: [{ model: Space, as:"space" }],
            order: [['createdAt', 'DESC']]
        });
        
        return res.success(
            httpStatus.OK,
            true,
            "User bookings fetched successfully",
            { bookings }
        );
        
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        return res.error(
            httpStatus.INTERNAL_SERVER_ERROR,
            false,
            "Error fetching user bookings",
            error
        );
    }
};

// Get user's meeting room bookings
userController.getUserRoomBookings = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const userMobile = req.user.mobile;
        
        // Find all meeting room bookings for the user by email or mobile
        const RoomBooking = require('../models/roomBooking.model');
        const MeetingRoom = require('../models/meetingRoom.model');
        const { Op } = require('sequelize');
        
        const roomBookings = await RoomBooking.findAll({
            where: {
                [Op.or]: [
                    { email: userEmail },
                    { mobile: userMobile }
                ]
            },
            include: [{ model: MeetingRoom }],
            order: [['createdAt', 'DESC']]
        });
        
        return res.success(
            httpStatus.OK,
            true,
            "User meeting room bookings fetched successfully",
            { roomBookings }
        );
        
    } catch (error) {
        console.error('Error fetching user meeting room bookings:', error);
        return res.error(
            httpStatus.INTERNAL_SERVER_ERROR,
            false,
            "Error fetching user meeting room bookings",
            error
        );
    }
};

//logOut controller...............
userController.logout = async (req, res) => {
    try {    
        return res.success(
            httpStatus.OK,
            true,
            "Logged out successfully"
        );
    } catch (error) {
        console.error('Logout error:', error);
        return res.error(
            httpStatus.INTERNAL_SERVER_ERROR,
            false,
            "Internal server error",
            error
        );
    }
};

//user profile details
userController.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    //Find all bookings by this user
    const bookings = await Booking.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bookings found for this user.",
      });
    }

    // Get all booking
    const bookingIds = bookings.map((b) => b.id);

    //Find KYC by user
    const kyc = await Kyc.findOne({ where: { userId } });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "No KYC found for this user.",
      });
    }

    //Count team members 
    const teamCount = await teamMember.count({
      where: { bookingId: bookingIds },
    });

    // response
    const profileData = {
      companyOrFreelancerName:
        kyc.type === "Company"
          ? kyc.companyName
          : kyc.name || "N/A",
      email: kyc.email,
      phone: kyc.mobile,
      teamSize: teamCount,
      profilePhoto: kyc.photo || null,
      type: kyc.type,
    };

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: profileData,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

// Update user profile (name, email, mobile, profile photo)
userController.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find or create KYC for user
    let kycRecord = await Kyc.findOne({ where: { userId } });

    const { name, email, mobile } = req.body;

    // Also fetch the user record so we can update primary profile fields
    const user = await User.findByPk(userId);
    if (!user) {
      return res.error(
        httpStatus.NOT_FOUND,
        false,
        "User not found"
      );
    }

    // If email is provided, ensure it's not used by another user
    if (email) {
      const emailOwner = await User.findOne({ where: { email } });
      if (emailOwner && emailOwner.id !== userId) {
        return res.error(
          httpStatus.CONFLICT,
          false,
          "Email is already in use by another account"
        );
      }
    }

    if (!kycRecord) {
      // create a minimal KYC record so profile info can be stored
      const createData = {
        userId,
        name: name || null,
        email: email || null,
        mobile: mobile || null,
      };

      if (req.file) {
        createData.photo = req.file.filename;
      }

      kycRecord = await Kyc.create(createData);
    } else {
      // update existing KYC fields if provided
      if (name) kycRecord.name = name;
      if (email) kycRecord.email = email;
      if (mobile) kycRecord.mobile = mobile;
      if (req.file) kycRecord.photo = req.file.filename;

      await kycRecord.save();
    }

    // Update User primary fields if provided
    let userUpdated = false;
    if (name && user.username !== name) {
      user.username = name;
      userUpdated = true;
    }
    if (email && user.email !== email) {
      user.email = email;
      userUpdated = true;
    }
    if (mobile && user.mobile !== mobile) {
      user.mobile = mobile;
      userUpdated = true;
    }

    if (userUpdated) await user.save();

    return res.success(
      httpStatus.OK,
      true,
      "Profile updated successfully",
      { profile: kycRecord }
    );
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Failed to update profile",
      error
    );
  }
};




module.exports = userController;