const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  User,
  Booking,
  Space,
  Kyc,
  teamMember,
  FCMToken,
  CafeteriaOrder,
  UtilityOrder,
  Utility,
  Vehicle,
} = require("../models");
const adminController = require("./admin.controller");
const httpStatus = require("../enums/httpStatusCode.enum");
const responseMessages = require("../enums/responseMessages.enum");
const {
  subscribeTokenToTopic,
  unsubscribeTokenFromTopic,
} = require("../utils/helper");
const { Op } = require("sequelize");

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
        "All fields are required",
      );
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.error(httpStatus.BAD_REQUEST, false, "Passwords do not match");
    }

    // Check if user with email or mobile already exists
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.error(
        httpStatus.CONFLICT,
        false,
        "User with this email already exists",
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user — userType is always 'visitor' by default until they get a space assigned
    const newUser = await User.create({
      username: userName,
      email,
      mobile,
      password: hashedPassword,
      userType: "visitor",
    });

    // Remove password from response
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        role: "user",
      },
      process.env.APP_SUPER_SECRET_KEY,
      { expiresIn: "24h" },
    );

    return res.success(httpStatus.CREATED, true, responseMessages.SAVE, {
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("User registration error:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error registering user",
      error,
    );
  }
};

// User login
userController.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Mobile number and password are required",
      );
    }

    const user = await User.findOne({ where: { mobile } });
    if (!user) {
      return res.error(
        httpStatus.UNAUTHORIZED,
        false,
        "Invalid mobile number or password",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.error(
        httpStatus.UNAUTHORIZED,
        false,
        "Invalid mobile number or password",
      );
    }

    // Find latest KYC for this user (if any)
    const userKyc = await Kyc.findOne({
      where: { userId: user.id },
      order: [["createdAt", "DESC"]],
    });

    const kycApproved = userKyc && userKyc.status === "Approve";

    // Check occupied space (confirmed booking) — only relevant if KYC is approved
    let occupiedSpace = null;
    if (kycApproved) {
      const userBooking = await Booking.findOne({
        where: { userId: user.id, status: "Confirm" },
        include: [
          {
            model: require("../models/space.model"),
            as: "space",
            attributes: ["id", "spaceName", "roomNumber", "cabinNumber"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      occupiedSpace =
        userBooking && userBooking.space
          ? {
              id: userBooking.space.id,
              name: userBooking.space.spaceName,
              roomNumber: userBooking.space.roomNumber,
              cabinNumber: userBooking.space.cabinNumber,
            }
          : null;
    }

    const userResponse = user.toJSON();
    delete userResponse.password;

    const token = jwt.sign(
      { id: user.id, username: user.username, role: "user" },
      process.env.APP_SUPER_SECRET_KEY,
      { expiresIn: "24h" },
    );

    return res.success(httpStatus.OK, true, "Login successful", {
      user: userResponse,
      token,
      kycStatus: userKyc ? userKyc.status : "not_submitted",
      kyc: kycApproved
        ? {
            name: userKyc.name,
            email: userKyc.email,
            mobile: userKyc.mobile,
            type: userKyc.type,
            cabinNumber: occupiedSpace ? occupiedSpace.cabinNumber : null,
            roomNumber: occupiedSpace ? occupiedSpace.roomNumber : null,
            spaceName: occupiedSpace ? occupiedSpace.name : null,
          }
        : null,
    });
  } catch (error) {
    console.error("User login error:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error during login",
      error,
    );
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
        status: "Confirm",
      },
      order: [["createdAt", "DESC"]],
    });

    if (!latestBooking) {
      return res.success(httpStatus.OK, true, "No active membership found", {
        valid_until: null,
        days_remaining: 0,
        status: "Inactive",
      });
    }

    // Calculate membership validity (assuming 30 days from booking date)
    const bookingDate = new Date(latestBooking.date);
    const validUntil = new Date(bookingDate);
    validUntil.setDate(validUntil.getDate() + 30); // 30 days membership

    // Calculate days remaining
    const today = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((validUntil - today) / (1000 * 60 * 60 * 24)),
    );

    // Determine membership status
    const status = daysRemaining > 0 ? "Active" : "Expired";

    return res.success(httpStatus.OK, true, "Membership details fetched", {
      valid_until: validUntil.toISOString().split("T")[0], // Format as YYYY-MM-DD
      days_remaining: daysRemaining,
      status: status,
    });
  } catch (error) {
    console.error("Error fetching membership details:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error fetching membership details",
      error,
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
      include: [{ model: Space, as: "space" }],
      order: [["createdAt", "DESC"]],
    });

    return res.success(
      httpStatus.OK,
      true,
      "User bookings fetched successfully",
      { bookings },
    );
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error fetching user bookings",
      error,
    );
  }
};

// Get user's meeting room bookings
userController.getUserRoomBookings = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userMobile = req.user.mobile;

    // Find all meeting room bookings for the user by email or mobile
    const RoomBooking = require("../models/roomBooking.model");
    const MeetingRoom = require("../models/meetingRoom.model");
    const { Op } = require("sequelize");

    const roomBookings = await RoomBooking.findAll({
      where: {
        [Op.or]: [{ email: userEmail }, { mobile: userMobile }],
      },
      include: [{ model: MeetingRoom }],
      order: [["createdAt", "DESC"]],
    });

    return res.success(
      httpStatus.OK,
      true,
      "User meeting room bookings fetched successfully",
      { roomBookings },
    );
  } catch (error) {
    console.error("Error fetching user meeting room bookings:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error fetching user meeting room bookings",
      error,
    );
  }
};

//logOut controller...............
userController.logout = async (req, res) => {
  try {
    return res.success(httpStatus.OK, true, "Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

//user profile details
userController.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = req.user;

    // Visitors get a simplified profile (no space booking / KYC required)
    if (user.userType === "visitor") {
      const kyc = await Kyc.findOne({ where: { userId } });
      const baseUrl = process.env.BASE_URL || "";
      const vehicles = await Vehicle.findAll({
        where: { userId },
        attributes: ["id", "vehicleNumber", "vehicleType"],
        order: [["createdAt", "ASC"]],
      });

      return res.status(200).json({
        success: true,
        message: "Visitor profile fetched successfully",
        data: {
          id: user.id,
          name: user.username,
          email: user.email,
          mobile: user.mobile,
          userType: user.userType,
          cabinNumber: user.cabinNumber,
          roomNumber: user.roomNumber,
          idProof: user.idProof ? `${baseUrl}/uploads/id-proofs/${user.idProof}` : null,
          kycStatus: kyc ? kyc.status : "not_submitted",
          kycDetails: kyc
            ? {
                id: kyc.id,
                documentType: kyc.type,
                name: kyc.name,
                email: kyc.email,
                mobile: kyc.mobile,
                status: kyc.status,
              }
            : null,
          vehicles,
        },
      });
    }

    //Find KYC by user
    const kyc = await Kyc.findOne({ where: { userId } });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "No KYC found for this user.",
      });
    }

    //Find all bookings by this user
    const bookings = await Booking.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    // Get all booking IDs (will be empty if no bookings)
    const bookingIds = bookings && bookings.length > 0 ? bookings.map((b) => b.id) : [];

    //Count team members
    const teamCount = bookingIds.length > 0 
      ? await teamMember.count({
          where: { bookingId: bookingIds },
        })
      : 0;

    // Fetch user's vehicles
    const vehicles = await Vehicle.findAll({
      where: { userId },
      attributes: ["id", "vehicleNumber", "vehicleType"],
      order: [["createdAt", "ASC"]],
    });

    // response
    const profileData = {
      companyOrFreelancerName:
        kyc.type === "Company" ? kyc.companyName : kyc.name || "N/A",
      email: kyc.email,
      phone: kyc.mobile,
      teamSize: teamCount,
      profilePhoto: kyc.photo || null,
      type: kyc.type,
      vehicles,
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
      return res.error(httpStatus.NOT_FOUND, false, "User not found");
    }

    // If email is provided, ensure it's not used by another user
    if (email) {
      const emailOwner = await User.findOne({ where: { email } });
      if (emailOwner && emailOwner.id !== userId) {
        return res.error(
          httpStatus.CONFLICT,
          false,
          "Email is already in use by another account",
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

    return res.success(httpStatus.OK, true, "Profile updated successfully", {
      profile: kycRecord,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Failed to update profile",
      error,
    );
  }
};

// Push notification: register token to user topic
userController.registerPushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.error(httpStatus.BAD_REQUEST, false, "token is required");
    await FCMToken.upsert({
      token: String(token),
      userId: req.user.id,
      role: "user",
    });
    const topic = `user_${req.user.id}`;
    try {
      await subscribeTokenToTopic(token, topic);
    } catch (firebaseErr) {
      console.warn("Push subscription skipped:", firebaseErr.message);
    }
    return res.success(
      httpStatus.OK,
      true,
      "Token registered and subscribed to user topic",
      { topic },
    );
  } catch (error) {
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Failed to register token",
      error.message,
    );
  }
};

// Push: subscribe to allowed topics
userController.subscribePushTopic = async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || !topic)
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "token and topic are required",
      );

    // Allowed topics for users
    const allowedTopics = new Set([
      "all_users", // Broadcast notifications
      `user_${req.user.id}`, // Personal notifications
      "cafeteria_updates", // Cafeteria service updates
      "booking_updates", // Booking status updates
      "meeting_room_updates", // Meeting room updates
      `user_${req.user.id}_cafeteria`, // Personal cafeteria orders
      `user_${req.user.id}_bookings`, // Personal booking notifications
      `user_${req.user.id}_rooms`, // Personal meeting room notifications
    ]);

    if (!allowedTopics.has(String(topic))) {
      return res.error(
        httpStatus.FORBIDDEN,
        false,
        `Topic "${topic}" not allowed. Allowed topics: all_users, user_${req.user.id}, cafeteria_updates, booking_updates, meeting_room_updates`,
      );
    }

    await subscribeTokenToTopic(token, topic);
    return res.success(httpStatus.OK, true, `Subscribed to ${topic}`);
  } catch (error) {
    if (error.message && error.message.includes("Firebase credentials not configured")) {
      return res.success(httpStatus.OK, true, `Subscribed to ${topic} (push notifications unavailable)`);
    }
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Subscribe failed",
      error.message,
    );
  }
};

userController.unsubscribePushTopic = async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || !topic)
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "token and topic are required",
      );
    await unsubscribeTokenFromTopic(token, topic);
    return res.success(httpStatus.OK, true, `Unsubscribed from ${topic}`);
  } catch (error) {
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Unsubscribe failed",
      error.message,
    );
  }
};

// Get complete user history (meeting room bookings + space bookings + invoices)
userController.getUserHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Extract query parameters
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const status = req.query.status;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder || "DESC";

    // Import necessary models and utilities
    const { Op } = require("sequelize");
    const RoomBooking = require("../models/roomBooking.model");
    const MeetingRoom = require("../models/meetingRoom.model");
    const { ZohoBooksService } = require("../config/zoho.config");

    // Build where clause for RoomBooking
    const roomBookingWhere = { userId };
    if (startDate && endDate) {
      roomBookingWhere.bookingDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      roomBookingWhere.bookingDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      roomBookingWhere.bookingDate = { [Op.lte]: new Date(endDate) };
    }
    if (status) {
      roomBookingWhere.status = status;
    }

    // Build where clause for Space Booking
    const bookingWhere = { userId };
    if (startDate && endDate) {
      bookingWhere[Op.or] = [
        {
          startDate: { [Op.between]: [new Date(startDate), new Date(endDate)] },
        },
        { endDate: { [Op.between]: [new Date(startDate), new Date(endDate)] } },
      ];
    } else if (startDate) {
      bookingWhere[Op.or] = [
        { startDate: { [Op.gte]: new Date(startDate) } },
        { endDate: { [Op.gte]: new Date(startDate) } },
      ];
    } else if (endDate) {
      bookingWhere[Op.or] = [
        { startDate: { [Op.lte]: new Date(endDate) } },
        { endDate: { [Op.lte]: new Date(endDate) } },
      ];
    }
    if (status) {
      bookingWhere.status = status;
    }

    //  meeting room bookings
    const roomBookingsData = await RoomBooking.findAndCountAll({
      where: roomBookingWhere,
      include: [
        {
          model: MeetingRoom,
          as: "meetingRoom",
          attributes: [
            "id",
            "name",
            "capacityType",
            "hourlyRate",
            "dayRate",
            "memberHourlyRate",
            "memberDayRate",
            "description",
            "openTime",
            "closeTime",
          ],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      distinct: true,
    });

    //  space bookings (using existing Booking model)
    const spaceBookingsData = await Booking.findAndCountAll({
      where: bookingWhere,
      include: [
        {
          model: Space,
          as: "space",
          attributes: ["id", "spaceName", "roomNumber", "cabinNumber", "price"],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      distinct: true,
    });

    // Fetch invoices from Zoho Books for the user
    let invoices = [];
    try {
      const zohoService = new ZohoBooksService();
      const allInvoices = await zohoService.getInvoices();

      // Filter invoices by user email
      if (allInvoices && allInvoices.invoices) {
        invoices = allInvoices.invoices.filter(
          (invoice) =>
            invoice.customer_name &&
            invoice.customer_name
              .toLowerCase()
              .includes(userEmail.split("@")[0].toLowerCase()),
        );
      }
    } catch (error) {
      console.error("Error fetching invoices from Zoho:", error.message);
      // Continue without invoices rather than failing the entire request
    }

    // Calculate pagination metadata
    const totalMeetingRoomBookings = roomBookingsData.count;
    const totalSpaceBookings = spaceBookingsData.count;
    const totalRecords = totalMeetingRoomBookings + totalSpaceBookings;
    const totalPages = Math.ceil(totalRecords / limit);

    // Prepare response
    const responseData = {
      data: {
        meetingRoomBookings: roomBookingsData.rows.map((booking) =>
          booking.toJSON ? booking.toJSON() : booking,
        ),
        spaceBookings: spaceBookingsData.rows.map((booking) =>
          booking.toJSON ? booking.toJSON() : booking,
        ),
        payments: invoices,
      },
      pagination: {
        total: totalRecords,
        page,
        limit,
        pages: totalPages,
        meetingRoomBookingsCount: totalMeetingRoomBookings,
        spaceBookingsCount: totalSpaceBookings,
      },
      summary: {
        totalMeetingRoomBookings,
        totalSpaceBookings,
        totalPayments: invoices.length,
      },
    };

    return res.success(
      httpStatus.OK,
      true,
      "User history retrieved successfully",
      responseData,
    );
  } catch (error) {
    console.error("Error fetching user history:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error retrieving user history",
      error.message,
    );
  }
};

// Visitor Registration (cafeteria/utility website)
// Requires id proof upload; no KYC needed. Sets userType = 'visitor'.
userController.visitorRegister = async (req, res) => {
  try {
    const {
      userName,
      name,
      username,
      email,
      mobile,
      phone,
      password,
      confirmPassword,
      confirm_password,
      cabinNumber,
      roomNumber,
    } = req.body;

    // Accept common field name variants sent by different frontends
    const resolvedName = userName || name || username;
    const resolvedMobile = mobile || phone;
    const resolvedConfirm = confirmPassword || confirm_password;

    if (!resolvedName || !email || !resolvedMobile || !password || !resolvedConfirm) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "All fields are required",
      );
    }

    if (!cabinNumber || !roomNumber) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Cabin number and room number are required",
      );
    }

    if (!req.file) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "ID proof is required",
      );
    }

    if (password !== resolvedConfirm) {
      return res.error(httpStatus.BAD_REQUEST, false, "Passwords do not match");
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.error(
        httpStatus.CONFLICT,
        false,
        "User with this email already exists",
      );
    }

    const existingMobile = await User.findOne({ where: { mobile: resolvedMobile } });
    if (existingMobile) {
      return res.error(
        httpStatus.CONFLICT,
        false,
        "User with this mobile number already exists",
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // userType is always 'visitor' for this endpoint — ignore any client-supplied value
    const newUser = await User.create({
      username: resolvedName,
      email,
      mobile: resolvedMobile,
      password: hashedPassword,
      userType: "visitor",
      idProof: req.file.filename,
      cabinNumber: cabinNumber || null,
      roomNumber: roomNumber || null,
    });

    const userResponse = newUser.toJSON();
    delete userResponse.password;

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: "user" },
      process.env.APP_SUPER_SECRET_KEY,
      { expiresIn: "24h" },
    );

    return res.success(httpStatus.CREATED, true, responseMessages.SAVE, {
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Visitor registration error:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error registering visitor",
      error,
    );
  }
};

// Login for cafeteria/utility website — accepts both visitors and members
userController.visitorLogin = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Mobile number and password are required",
      );
    }

    const user = await User.findOne({ where: { mobile } });
    if (!user) {
      return res.error(
        httpStatus.UNAUTHORIZED,
        false,
        "Invalid mobile number or password",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.error(
        httpStatus.UNAUTHORIZED,
        false,
        "Invalid mobile number or password",
      );
    }

    // Find latest KYC for this user (if any)
    const userKyc = await Kyc.findOne({
      where: { userId: user.id },
      order: [["createdAt", "DESC"]],
    });

    const kycApproved = userKyc && userKyc.status === "Approve";

    // Fetch occupied space only if KYC is approved
    let occupiedSpace = null;
    if (kycApproved) {
      const userBooking = await Booking.findOne({
        where: { userId: user.id, status: "Confirm" },
        include: [
          {
            model: require("../models/space.model"),
            as: "space",
            attributes: ["id", "spaceName", "roomNumber", "cabinNumber"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      occupiedSpace =
        userBooking && userBooking.space
          ? {
              id: userBooking.space.id,
              name: userBooking.space.spaceName,
              roomNumber: userBooking.space.roomNumber,
              cabinNumber: userBooking.space.cabinNumber,
            }
          : null;
    }

    const userResponse = user.toJSON();
    delete userResponse.password;

    const token = jwt.sign(
      { id: user.id, username: user.username, role: "user" },
      process.env.APP_SUPER_SECRET_KEY,
      { expiresIn: "24h" },
    );

    return res.success(httpStatus.OK, true, "Login successful", {
      user: userResponse,
      token,
      kycStatus: userKyc ? userKyc.status : "not_submitted",
      kyc: kycApproved
        ? {
            name: userKyc.name,
            email: userKyc.email,
            mobile: userKyc.mobile,
            type: userKyc.type,
            cabinNumber: occupiedSpace ? occupiedSpace.cabinNumber : null,
            roomNumber: occupiedSpace ? occupiedSpace.roomNumber : null,
            spaceName: occupiedSpace ? occupiedSpace.name : null,
          }
        : null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error during login",
      error,
    );
  }
};

// Get combined order history (cafeteria + utilities)
userController.getOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 15, type = "all", status, fromDate, toDate } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let allOrders = [];
    let totalCount = 0;

    // Build date filter if provided
    const dateFilter = {};
    if (fromDate || toDate) {
      if (fromDate) {
        dateFilter[Op.gte] = new Date(fromDate);
      }
      if (toDate) {
        dateFilter[Op.lte] = new Date(toDate);
      }
    }

    // Fetch cafeteria orders
    if (type === "all" || type === "cafeteria") {
      const cafeteriaWhere = { userId };
      if (status) cafeteriaWhere.status = status;
      if (Object.keys(dateFilter).length > 0) cafeteriaWhere.createdAt = dateFilter;

      const cafeteriaOrders = await CafeteriaOrder.findAll({
        where: cafeteriaWhere,
        include: [
          {
            model: Space,
            as: "space",
            attributes: ["id", "spaceName", "cabinNumber", "roomNumber"],
          },
        ],
        attributes: [
          "id",
          "itemName",
          "quantity",
          "price",
          "totalAmount",
          "status",
          "paid",
          "specialInstructions",
          "createdAt",
        ],
      });

      const cafeteriaFormatted = cafeteriaOrders.map((order) => ({
        id: order.id,
        type: "cafeteria",
        itemName: order.itemName,
        quantity: order.quantity,
        unitPrice: order.price,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paid,
        specialInstructions: order.specialInstructions,
        location: order.space
          ? `${order.space.spaceName} (${order.space.cabinNumber || order.space.roomNumber})`
          : null,
        createdAt: order.createdAt,
      }));

      allOrders.push(...cafeteriaFormatted);
    }

    // Fetch utility orders
    if (type === "all" || type === "utility") {
      const utilityWhere = { userId };
      if (status) utilityWhere.status = status;
      if (Object.keys(dateFilter).length > 0) utilityWhere.createdAt = dateFilter;

      const utilityOrders = await UtilityOrder.findAll({
        where: utilityWhere,
        include: [
          {
            model: Utility,
            as: "utility",
            attributes: ["id", "name", "category", "price"],
          },
        ],
        attributes: [
          "id",
          "quantity",
          "price",
          "totalAmount",
          "status",
          "paid",
          "specialInstructions",
          "createdAt",
        ],
      });

      const utilityFormatted = utilityOrders.map((order) => ({
        id: order.id,
        type: "utility",
        itemName: order.utility?.name || "Unknown",
        category: order.utility?.category || null,
        quantity: order.quantity,
        unitPrice: order.price,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paid,
        specialInstructions: order.specialInstructions,
        createdAt: order.createdAt,
      }));

      allOrders.push(...utilityFormatted);
    }

    // Sort by date (most recent first)
    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    totalCount = allOrders.length;

    // Apply pagination
    const paginatedOrders = allOrders.slice(offset, offset + parseInt(limit));
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Order history fetched successfully",
      data: {
        orders: paginatedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders: totalCount,
          limit: parseInt(limit),
        },
        summary: {
          totalCafeteriaOrders: allOrders.filter((o) => o.type === "cafeteria").length,
          totalUtilityOrders: allOrders.filter((o) => o.type === "utility").length,
          totalSpent: allOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching order history:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch order history",
      error: error.message,
    });
  }
};

// ─── Vehicle Management ────────────────────────────────────────────────────

// GET /user/vehicles — list the current user's vehicles
userController.getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({
      where: { userId: req.user.id },
      attributes: ["id", "vehicleNumber", "vehicleType", "createdAt"],
      order: [["createdAt", "ASC"]],
    });
    return res.success(httpStatus.OK, true, "Vehicles fetched successfully", { vehicles });
  } catch (error) {
    return res.error(httpStatus.INTERNAL_SERVER_ERROR, false, "Failed to fetch vehicles", error.message);
  }
};

// POST /user/vehicles — add a new vehicle
userController.addVehicle = async (req, res) => {
  try {
    const { vehicleNumber, vehicleType } = req.body;
    if (!vehicleNumber || !vehicleType) {
      return res.error(httpStatus.BAD_REQUEST, false, "vehicleNumber and vehicleType are required");
    }
    const vehicle = await Vehicle.create({
      userId: req.user.id,
      vehicleNumber: String(vehicleNumber).trim(),
      vehicleType: String(vehicleType).trim(),
    });
    return res.success(httpStatus.CREATED, true, "Vehicle added successfully", { vehicle });
  } catch (error) {
    return res.error(httpStatus.INTERNAL_SERVER_ERROR, false, "Failed to add vehicle", error.message);
  }
};

// PUT /user/vehicles/:id — update a vehicle
userController.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!vehicle) {
      return res.error(httpStatus.NOT_FOUND, false, "Vehicle not found");
    }
    const { vehicleNumber, vehicleType } = req.body;
    if (vehicleNumber) vehicle.vehicleNumber = String(vehicleNumber).trim();
    if (vehicleType) vehicle.vehicleType = String(vehicleType).trim();
    await vehicle.save();
    return res.success(httpStatus.OK, true, "Vehicle updated successfully", { vehicle });
  } catch (error) {
    return res.error(httpStatus.INTERNAL_SERVER_ERROR, false, "Failed to update vehicle", error.message);
  }
};

// DELETE /user/vehicles/:id — remove a vehicle
userController.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!vehicle) {
      return res.error(httpStatus.NOT_FOUND, false, "Vehicle not found");
    }
    await vehicle.destroy();
    return res.success(httpStatus.OK, true, "Vehicle deleted successfully");
  } catch (error) {
    return res.error(httpStatus.INTERNAL_SERVER_ERROR, false, "Failed to delete vehicle", error.message);
  }
};

module.exports = userController;
