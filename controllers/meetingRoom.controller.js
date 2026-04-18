const httpStatus = require("../enums/httpStatusCode.enum");
const MeetingRoom = require("../models/meetingRoom.model");
const RoomBooking = require("../models/roomBooking.model");
const User = require("../models/user.model");
const Kyc = require("../models/kyc.model");
const { Op } = require("sequelize");
const {
  sendMail,
  sendPushToUserTopic,
  sendPushToTopic,
} = require("../utils/helper");
const { emailTemplate } = require("../utils/emailTemplate");

const meetingRoomController = {};

const BLOCKING_BOOKING_STATUSES = [
  "pending",
  "Pending",
  "confirm",
  "Confirm",
  "confirmed",
  "Confirmed",
];

const normalizeSlot = (slot) => (slot || "").toString().replace(/\s+/g, "");

const normalizeBookingType = (bookingType) =>
  (bookingType || "").toString().trim().toLowerCase();

const isWholeDayBooking = (bookingType) =>
  normalizeBookingType(bookingType) === "whole day";

const isHourlyBooking = (bookingType) =>
  normalizeBookingType(bookingType) === "hourly";

const isConfirmedBookingStatus = (status) => {
  const normalizedStatus = (status || "").toString().trim().toLowerCase();
  return normalizedStatus === "confirm" || normalizedStatus === "confirmed";
};

const getBookingSlots = (timeSlots) => {
  if (!timeSlots) {
    return [];
  }

  if (Array.isArray(timeSlots)) {
    return timeSlots;
  }

  if (typeof timeSlots === "string") {
    try {
      const parsedSlots = JSON.parse(timeSlots);
      if (Array.isArray(parsedSlots)) {
        return parsedSlots;
      }
    } catch (error) {
      return timeSlots
        .split(",")
        .map((slot) => slot.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (["true", "1", "yes", "active"].includes(normalizedValue)) {
      return true;
    }
    if (["false", "0", "no", "inactive"].includes(normalizedValue)) {
      return false;
    }
  }

  return null;
};

meetingRoomController.addMeetingRoom = async (req, res) => {
  try {
    const {
      name,
      capacityType,
      hourlyRate,
      dayRate,
      memberHourlyRate,
      memberDayRate,
      description,
      openTime,
      closeTime,
      status,
    } = req.body;

    if (
      !name ||
      !capacityType ||
      hourlyRate === undefined ||
      dayRate === undefined ||
      memberHourlyRate === undefined ||
      memberDayRate === undefined
    ) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Name, capacity type, hourly rate, day rate, member hourly rate and member day rate are required",
      );
    }

    const numericFields = {
      hourlyRate: Number(hourlyRate),
      dayRate: Number(dayRate),
      memberHourlyRate: Number(memberHourlyRate),
      memberDayRate: Number(memberDayRate),
    };

    const hasInvalidRate = Object.values(numericFields).some(
      (value) => Number.isNaN(value) || value < 0,
    );

    if (hasInvalidRate) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "All rate fields must be valid positive numbers",
      );
    }

    const existingRoom = await MeetingRoom.findOne({
      where: { capacityType: capacityType.trim() },
    });

    if (existingRoom) {
      return res.error(
        httpStatus.CONFLICT,
        false,
        "A meeting room with this capacity type already exists",
      );
    }

    const parsedStatus =
      status === undefined ? true : parseBoolean(status);

    if (status !== undefined && parsedStatus === null) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Status must be a boolean value",
      );
    }

    // Handle image upload
    let imagePath = null;
    if (req.file && req.file.filename) {
      imagePath = `/uploads/meeting-rooms/${req.file.filename}`;
    }

    const room = await MeetingRoom.create({
      name: name.trim(),
      capacityType: capacityType.trim(),
      hourlyRate: numericFields.hourlyRate,
      dayRate: numericFields.dayRate,
      memberHourlyRate: numericFields.memberHourlyRate,
      memberDayRate: numericFields.memberDayRate,
      description: description ? description.trim() : null,
      openTime: openTime || "09:00 AM",
      closeTime: closeTime || "06:30 PM",
      status: parsedStatus,
      image: imagePath,
    });

    return res.success(
      httpStatus.CREATED,
      true,
      "Meeting room added successfully",
      room,
    );
  } catch (error) {
    console.error("Error adding meeting room:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Get all meeting rooms (user side)
meetingRoomController.getMeetingRooms = async (req, res) => {
  try {
    const rooms = await MeetingRoom.findAll({
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
        "image",
        "status",
      ],
      order: [["createdAt", "ASC"]],
    });

    return res.success(
      httpStatus.OK,
      true,
      "Meeting rooms fetched successfully",
      rooms,
    );
  } catch (error) {
    console.error("Error fetching meeting rooms:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Get room types (seating capacities)
meetingRoomController.getRoomTypes = async (req, res) => {
  try {
    const roomTypes = await MeetingRoom.findAll({
      attributes: ["id", "capacityType", "status"],
      order: [["createdAt", "ASC"]],
    });

    return res.success(
      httpStatus.OK,
      true,
      "Room types fetched successfully",
      roomTypes.map((room) => ({ id: room.id, name: room.capacityType })),
    );
  } catch (error) {
    console.error("Error fetching room types:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Get booking types
meetingRoomController.getBookingTypes = async (req, res) => {
  try {
    return res.success(
      httpStatus.OK,
      true,
      "Booking types fetched successfully",
      [
        { id: 1, name: "Hourly" },
        { id: 2, name: "Whole Day" },
      ],
    );
  } catch (error) {
    console.error("Error fetching booking types:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Get member types
meetingRoomController.getMemberTypes = async (req, res) => {
  try {
    return res.success(
      httpStatus.OK,
      true,
      "Member types fetched successfully",
      [
        { id: 1, name: "Member" },
        { id: 2, name: "Non-Member" },
      ],
    );
  } catch (error) {
    console.error("Error fetching member types:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Get room pricing based on booking type and member type
meetingRoomController.getRoomPricing = async (req, res) => {
  try {
    const { capacityType, bookingType, memberType } = req.query;

    if (!capacityType || !bookingType || !memberType) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Capacity type, booking type, and member type are required",
      );
    }

    // Find room by capacity type
    const room = await MeetingRoom.findOne({
      where: { capacityType },
    });

    if (!room) {
      return res.error(httpStatus.NOT_FOUND, false, "Meeting room not found");
    }

    let price;
    if (bookingType === "Hourly") {
      price = memberType === "Member" ? room.memberHourlyRate : room.hourlyRate;
    } else {
      price = memberType === "Member" ? room.memberDayRate : room.dayRate;
    }

    return res.success(
      httpStatus.OK,
      true,
      "Room pricing fetched successfully",
      {
        price,
        pricePerThirtyMin: memberType === "Member" ? price / 2 : null, // Only for members
        openTime: room.openTime,
        closeTime: room.closeTime,
        bookingType,
        memberType,
        capacityType,
        includesGST: bookingType === "Whole Day" ? true : false,
        note:
          bookingType === "Hourly"
            ? "GST will be added to the hourly rate"
            : "GST is included in the day rate",
      },
    );
  } catch (error) {
    console.error("Error fetching room pricing:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Helper function to convert time from 12-hour to 24-hour format
const convertTo24Hour = (time12h) => {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");

  if (hours === "12") {
    hours = "00";
  }

  if (modifier === "PM") {
    hours = parseInt(hours, 10) + 12;
  }

  return `${hours}:${minutes}`;
};

// Helper function to generate time slots
const generateTimeSlots = (openTime, closeTime, durationMinutes) => {
  const slots = [];
  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);

  let currentHour = openHour;
  let currentMinute = openMinute;

  while (
    currentHour < closeHour ||
    (currentHour === closeHour && currentMinute < closeMinute)
  ) {
    const startHour = currentHour.toString().padStart(2, "0");
    const startMinute = currentMinute.toString().padStart(2, "0");

    // Calculate end time
    let endMinute = currentMinute + durationMinutes;
    let endHour = currentHour;

    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60);
      endMinute %= 60;
    }

    // Skip if end time is after closing time
    if (
      endHour > closeHour ||
      (endHour === closeHour && endMinute > closeMinute)
    ) {
      break;
    }

    const endHourStr = endHour.toString().padStart(2, "0");
    const endMinuteStr = endMinute.toString().padStart(2, "0");

    // Format: "09:00 - 09:30"
    slots.push(`${startHour}:${startMinute} - ${endHourStr}:${endMinuteStr}`);

    // Move to next slot
    currentMinute += durationMinutes;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute %= 60;
    }
  }

  return slots;
};

// Get available time slots for a specific date
meetingRoomController.getAvailableTimeSlots = async (req, res) => {
  try {
    const { date, capacityType, memberType } = req.query;

    if (!date || !capacityType || !memberType) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Date, Capacity & Member type are required",
      );
    }

    // Find room by capacity type
    const room = await MeetingRoom.findOne({ where: { capacityType } });
    if (!room) {
      return res.error(httpStatus.NOT_FOUND, false, "Meeting room not found");
    }

    // Include both 'pending' and 'confirmed' so slots are blocked once a user books & uploads payment.
    const existingBookings = await RoomBooking.findAll({
      where: {
        meetingRoomId: room.id,
        bookingDate: date,
        status: { [Op.in]: BLOCKING_BOOKING_STATUSES },
      },
    });

    const wholeDayBookingExists = existingBookings.some((booking) =>
      isWholeDayBooking(booking.bookingType),
    );

    // Generate all possible time slots (assumes generateTimeSlots returns strings like "09:00 - 09:30")
    let openTime = room.openTime || "09:00 AM";
    let closeTime = room.closeTime || "06:30 PM";

    // If non-member must see 1-hour slots adjust duration and (optionally) closeTime
    let durationMinutes = 30;
    if (String(memberType).toLowerCase().includes("non")) {
      durationMinutes = 60;
      // If you want non-members to see closeTime as 06:00 rather than 06:30:
      if (closeTime === "06:30 PM") closeTime = "06:00 PM";
    }

    const openHour = convertTo24Hour(openTime);
    const closeHour = convertTo24Hour(closeTime);
    const allTimeSlots = generateTimeSlots(
      openHour,
      closeHour,
      durationMinutes,
    );

    const bookedSlotsRaw = existingBookings
      .filter((booking) => isHourlyBooking(booking.bookingType))
      .flatMap((booking) => getBookingSlots(booking.timeSlots));

    const bookedSet = new Set(bookedSlotsRaw.map(normalizeSlot));

    const availableSlots = wholeDayBookingExists
      ? []
      : allTimeSlots.filter(
          (slot) => !bookedSet.has(normalizeSlot(slot)),
        );

    return res.success(
      httpStatus.OK,
      true,
      "Available time slots fetched successfully",
      {
        availableSlots,
        bookedSlots: [...bookedSet].map((s) => {
          // convert back to readable format (insert space around dash)
          return s.replace("-", " - ");
        }),
        wholeDayBooked: wholeDayBookingExists,
        openTime,
        closeTime,
        slotDuration: `${durationMinutes} Minutes`,
        memberType,
      },
    );
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Get available amenities
meetingRoomController.getAmenities = async (req, res) => {
  try {
    return res.success(httpStatus.OK, true, "Amenities fetched successfully", [
      "Tea",
      "Coffee",
    ]);
  } catch (error) {
    console.error("Error fetching amenities:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Book a meeting room & upload payment screenshot
meetingRoomController.bookRoom = async (req, res) => {
  try {
    const {
      capacityType,
      bookingDate,
      timeSlots: timeSlotString,
      duration,
      bookingType,
      memberType,
      notes,
      gst,
    } = req.body;
    let timeSlots = timeSlotString;
    if (timeSlotString && typeof timeSlotString === "string") {
      try {
        timeSlots = JSON.parse(timeSlotString);
      } catch (e) {
        // If it's a comma-separated string, convert to array
        timeSlots = timeSlotString.split(",").map((slot) => slot.trim());
      }
    }

    // Ensure timeSlots is an array
    if (timeSlots && !Array.isArray(timeSlots)) {
      timeSlots = [timeSlots];
    }

    // Get customer information from authenticated user
    if (!req.user) {
      return res.error(
        httpStatus.UNAUTHORIZED,
        false,
        "Unauthorized: missing or invalid token",
      );
    }
    const userName = req.user.username;
    const userEmail = req.user.email;
    const userPhone = req.user.mobile;
    const userId = req.user.id;

    // Check for required fields
    if (!capacityType || !bookingDate || !bookingType || !memberType) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Required fields are missing",
      );
    }

    // // Different validation for members vs non-members
    //if (memberType !== "Member") {
    //   // Non-members must provide ID proof
    //   if (!req.files || !req.files.idProof) {
    //     return res.error(
    //       httpStatus.BAD_REQUEST,
    //       false,
    //     "ID proof is required for non-members"
    //   );
    // }

    // Non-members must provide payment screenshot
    if (memberType !== "Member") {
      if (!req.files || !req.files.paymentScreenshot) {
        return res.error(
          httpStatus.BAD_REQUEST,
          false,
          "Payment screenshot is required for non-members",
        );
      }
    }
    // }

    // Validate duration if provided for hourly bookings
    if (
      bookingType === "Hourly" &&
      (!duration || !["30 Minutes", "1 Hour"].includes(duration))
    ) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Duration must be either '30 Minutes' or '1 Hour' for hourly bookings",
      );
    }

    // Find room by capacity type
    const room = await MeetingRoom.findOne({
      where: { capacityType },
    });

    if (!room) {
      return res.error(httpStatus.NOT_FOUND, false, "Meeting room not found");
    }

    // Calculate price based on booking type and member type
    let basePrice;
    if (bookingType === "Hourly") {
      basePrice = parseInt(
        memberType === "Member" ? room.memberHourlyRate : room.hourlyRate,
      );
    } else {
      basePrice = parseInt(
        memberType === "Member" ? room.memberDayRate : room.dayRate,
      );
    }

    // Calculate total amount
    let totalAmount;
    if (bookingType === "Hourly" && timeSlots && timeSlots.length > 0) {
      // For hourly bookings, calculate based on number of slots and duration
      const hourMultiplier = duration === "1 Hour" ? 1 : 0.5; // 30 min = 0.5 hour
      const totalHours = timeSlots.length * hourMultiplier;
      // Base price is per hour
      const subtotal = basePrice * totalHours;
      //GST 18% for hourly bookings
      totalAmount = subtotal * 1.18;
    } else {
      // For whole day bookings, GST is already included
      totalAmount = basePrice;
    }

    const existingBookings = await RoomBooking.findAll({
      where: {
        meetingRoomId: room.id,
        bookingDate,
        status: { [Op.in]: BLOCKING_BOOKING_STATUSES },
      },
    });

    const wholeDayBookingExists = existingBookings.some((booking) =>
      isWholeDayBooking(booking.bookingType),
    );

    if (isHourlyBooking(bookingType) && timeSlots && timeSlots.length > 0) {
      if (wholeDayBookingExists) {
        return res.error(
          httpStatus.CONFLICT,
          false,
          "This seater is already booked for the whole day on the selected date",
        );
      }

      const bookedSlots = existingBookings
        .filter((booking) => isHourlyBooking(booking.bookingType))
        .flatMap((booking) => getBookingSlots(booking.timeSlots));

      const bookedSlotSet = new Set(bookedSlots.map(normalizeSlot));

      const conflictingSlots = timeSlots.filter((slot) =>
        bookedSlotSet.has(normalizeSlot(slot)),
      );

      if (conflictingSlots.length > 0) {
        const uniqueConflictingSlots = [...new Set(conflictingSlots)];

        return res.error(
          httpStatus.CONFLICT,
          false,
          `The following time slots are already booked: ${uniqueConflictingSlots.join(", ")}`,
        );
      }
    }

    if (isWholeDayBooking(bookingType) && existingBookings.length > 0) {
      return res.error(
        httpStatus.CONFLICT,
        false,
        "This seater is not available for a whole-day booking on the selected date",
      );
    }

    // Prepare file paths
    const bookingData = {
      meetingRoomId: room.id,
      username: userName,
      email: userEmail,
      mobile: userPhone,
      userId: userId,
      bookingDate,
      timeSlots: bookingType === "Hourly" ? timeSlots : null,
      duration: bookingType === "Hourly" ? duration : null,
      bookingType,
      memberType,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      status: memberType === "Member" ? "Confirm" : "pending", // Auto-confirm for members
      notes,
      gst: gst || null,
    };

    // Add file paths for non-members
    if (memberType !== "Member") {
      if (req.files.paymentScreenshot) {
        bookingData.paymentScreenshot = `/uploads/meeting-rooms/${req.files.paymentScreenshot[0].filename}`;
      }
      if (req.files.idProof) {
        bookingData.idProof = `/uploads/meeting-rooms/${req.files.idProof[0].filename}`;
      }
      if (req.files.coi) {
        bookingData.certificateOfIncorporation = `/uploads/meeting-rooms/${req.files.coi[0].filename}`;
      }
    } else {
      bookingData.paymentScreenshot = null;
    }

    // Create booking
    const booking = await RoomBooking.create(bookingData);
    // EMAIL and PUSH NOTIFICATIONS
    try {
      // Fetch KYC for company name
      const kyc = await Kyc.findOne({ where: { userId } });
      const kycCompanyName = kyc ? kyc.companyName || kyc.name || "N/A" : "N/A";
      // Prepare common data
      const emailData = {
        clientName: userName,
        companyName: kycCompanyName,
        amount: booking.totalAmount,
        date: booking.bookingDate,
        bookingType: "Meeting Room",
        status: isConfirmedBookingStatus(booking.status) ? "Confirmed" : "Pending",
      };

      const html = emailTemplate(emailData);

      //  Email to Admin
      try {
        await sendMail(
          process.env.ADMIN_EMAIL,
          "New Meeting Room Booking",
          html,
        );
        console.log(`Admin email sent for meeting booking #${booking.id}`);
      } catch (e) {
        console.error("Admin email failed:", e.message);
      }

      // Email to User
      try {
        await sendMail(
          userEmail,
          isConfirmedBookingStatus(booking.status)
            ? "Meeting Room Booking Confirmed"
            : "Meeting Room Booking Pending",
          html,
        );
        console.log(` User email sent to ${userEmail}`);
      } catch (e) {
        console.error(" User email failed:", e.message);
      }

      //  Push to User
      try {
        await sendPushToUserTopic(userId, {
          notification: {
            title: "Meeting Room Booking",
            body:
              isConfirmedBookingStatus(booking.status)
                ? "Your booking is confirmed"
                : "Your booking is pending verification",
          },
          data: {
            type: "meeting_booking",
            bookingId: String(booking.id),
          },
        });
      } catch (e) {
        console.error(" Push to user failed:", e.message);
      }

      //  Push to Admin Topic
      try {
        await sendPushToTopic("admins", {
          notification: {
            title: "New Meeting Booking",
            body: `Booking #${booking.id}`,
          },
          data: {
            type: "meeting_booking",
            bookingId: String(booking.id),
          },
        });
      } catch (e) {
        console.error("Push to admin failed:", e.message);
      }
    } catch (err) {
      console.error("Notification system error:", err.message);
    }

    const responseMessage =
      memberType === "Member"
        ? "Meeting room booked successfully. Your booking is confirmed."
        : "Meeting room booked successfully. Your booking is pending admin verification.";

    return res.success(httpStatus.CREATED, true, responseMessage, {
      booking,
      roomName: room.name,
      roomType: room.capacityType,
      totalAmount: booking.totalAmount,
      status: booking.status,
    });
  } catch (error) {
    console.error("Error booking meeting room:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Update a meeting room (admin only)
meetingRoomController.updateMeetingRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      capacityType,
      hourlyRate,
      dayRate,
      memberHourlyRate,
      memberDayRate,
      description,
      openTime,
      closeTime,
      status,
    } = req.body;

    const room = await MeetingRoom.findByPk(id);
    if (!room) {
      return res.error(httpStatus.NOT_FOUND, false, "Meeting room not found");
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (openTime !== undefined) updateData.openTime = openTime;
    if (closeTime !== undefined) updateData.closeTime = closeTime;

    if (capacityType !== undefined) updateData.capacityType = capacityType.trim();

    const rateFields = { hourlyRate, dayRate, memberHourlyRate, memberDayRate };
    for (const [key, value] of Object.entries(rateFields)) {
      if (value !== undefined) {
        const parsed = Number(value);
        if (isNaN(parsed) || parsed < 0) {
          return res.error(
            httpStatus.BAD_REQUEST,
            false,
            `${key} must be a valid positive number`,
          );
        }
        updateData[key] = parsed;
      }
    }

    if (status !== undefined) {
      const validStatuses = [true, false, "true", "false"];
      if (!validStatuses.includes(status)) {
        return res.error(httpStatus.BAD_REQUEST, false, "Status must be true or false");
      }
      updateData.status = status === true || status === "true";
    }

    if (req.file && req.file.filename) {
      updateData.image = `/uploads/meeting-rooms/${req.file.filename}`;
    }

    await room.update(updateData);

    return res.success(httpStatus.OK, true, "Meeting room updated successfully", room);
  } catch (error) {
    console.error("Error updating meeting room:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// for admin to verify bookings
meetingRoomController.verifyBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!bookingId) {
      return res.error(httpStatus.BAD_REQUEST, false, "Booking ID is required");
    }

    if (!status || !["Confirm", "Reject"].includes(status)) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Status must be either 'Confirm' or 'Reject'",
      );
    }

    // Find booking
    const booking = await RoomBooking.findByPk(bookingId);

    if (!booking) {
      return res.error(httpStatus.NOT_FOUND, false, "Booking not found");
    }

    // Update status
    await booking.update({ status });

    // Get room details
    const room = await MeetingRoom.findByPk(booking.meetingRoomId);

    //  EMAIL + PUSH
    try {
      const bookingKyc = await Kyc.findOne({ where: { userId: booking.userId } });
      const bookingCompanyName = bookingKyc ? bookingKyc.companyName || bookingKyc.name || "N/A" : "N/A";
      const emailData = {
        clientName: booking.username,
        companyName: bookingCompanyName,
        amount: booking.totalAmount,
        date: booking.bookingDate,
        bookingType: "Meeting Room",
        status: status === "Confirm" ? "Confirmed" : "Rejected",
      };

      const html = emailTemplate(emailData);

      // Email to User
      try {
        await sendMail(
          booking.email,
          `Meeting Room ${status === "Confirm" ? "Confirmed" : "Rejected"}`,
          html,
        );
        console.log(`Email sent to user ${booking.email}`);
      } catch (e) {
        console.error(" User email failed:", e.message);
      }

      //  Push to User
      try {
        await sendPushToUserTopic(booking.userId, {
          notification: {
            title: `Meeting Room ${status === "Confirm" ? "Confirmed" : "Rejected"}`,
            body: `Booking #${booking.id}`,
          },
          data: {
            type: "meeting_booking_status",
            bookingId: String(booking.id),
            status: status,
          },
        });
      } catch (e) {
        console.error("Push user failed:", e.message);
      }

      // Push to Admin Topic
      try {
        await sendPushToTopic("admins", {
          notification: {
            title: `Meeting Booking ${status}`,
            body: `Booking #${booking.id}`,
          },
          data: {
            type: "meeting_booking_status",
            bookingId: String(booking.id),
            status: status,
          },
        });
      } catch (e) {
        console.error("Push admin failed:", e.message);
      }
    } catch (err) {
      console.error("Notification system error:", err.message);
    }

    const message =
      status === "Confirm"
        ? "Booking confirmed successfully"
        : "Booking rejected successfully";

    return res.success(httpStatus.OK, true, message, booking);
  } catch (error) {
    console.error("Error verifying booking:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Whole-day availability by month (free vs booked days)
meetingRoomController.getAvailableDays = async (req, res) => {
  try {
    const { capacityType, year, month } = req.query;

    if (!capacityType || !year || !month) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "capacityType, year and month are required",
      );
    }

    const room = await MeetingRoom.findOne({ where: { capacityType } });
    if (!room) {
      return res.error(httpStatus.NOT_FOUND, false, "Meeting room not found");
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10); // 1..12
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return res.error(httpStatus.BAD_REQUEST, false, "Invalid year or month");
    }

    // First and last day of the requested month
    const start = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0).getDate();
    const startStr = start.toISOString().slice(0, 10);
    const end = new Date(y, m - 1, lastDay);
    const endStr = end.toISOString().slice(0, 10);

    // Block days if there is any booking in 'pending' or 'confirmed' status
    // (both Hourly and Whole Day bookings block full-day bookings)
    const bookings = await RoomBooking.findAll({
      where: {
        meetingRoomId: room.id,
        bookingDate: { [Op.between]: [startStr, endStr] },
        status: { [Op.in]: BLOCKING_BOOKING_STATUSES },
      },
      attributes: ["bookingDate", "bookingType", "timeSlots"],
    });

    const wholeDayBookedDateSet = new Set(
      bookings
        .filter((booking) => isWholeDayBooking(booking.bookingType))
        .map((booking) => booking.bookingDate),
    );

    const partiallyBookedDateSet = new Set(
      bookings
        .filter((booking) => isHourlyBooking(booking.bookingType))
        .map((booking) => booking.bookingDate),
    );

    const freeDates = [];
    const bookedDates = [];
    const partiallyBookedDates = [];

    for (let d = 1; d <= lastDay; d++) {
      const dateObj = new Date(y, m - 1, d);
      const dateStr = dateObj.toISOString().slice(0, 10);
      if (wholeDayBookedDateSet.has(dateStr)) {
        bookedDates.push(dateStr);
      } else if (partiallyBookedDateSet.has(dateStr)) {
        partiallyBookedDates.push(dateStr);
        freeDates.push(dateStr);
      } else {
        freeDates.push(dateStr);
      }
    }

    return res.success(
      httpStatus.OK,
      true,
      "Available days fetched successfully",
      {
        roomId: room.id,
        capacityType,
        year: y,
        month: m,
        freeDates,
        bookedDates,
        partiallyBookedDates,
      },
    );
  } catch (error) {
    console.error("Error fetching available days:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

// Delete a meeting room (admin only)
meetingRoomController.deleteMeetingRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await MeetingRoom.findByPk(id);
    if (!room) {
      return res.error(httpStatus.NOT_FOUND, false, "Meeting room not found");
    }

    await room.destroy();

    return res.success(httpStatus.OK, true, "Meeting room deleted successfully");
  } catch (error) {
    console.error("Error deleting meeting room:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error,
    );
  }
};

module.exports = meetingRoomController;
