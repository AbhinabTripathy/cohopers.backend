const httpStatus = require("../enums/httpStatusCode.enum");
const MeetingRoom = require("../models/meetingRoom.model");
const RoomBooking = require("../models/roomBooking.model");
const User = require("../models/user.model")
const { Op } = require("sequelize");

const meetingRoomController = {};

// Get room types (seating capacities)
meetingRoomController.getRoomTypes = async (req, res) => {
  try {
    return res.success(
      httpStatus.OK,
      true,
      "Room types fetched successfully",
      [
        { id: 1, name: "4-6 Seater" },
        { id: 2, name: "10-12 Seater" }
      ]
    );
  } catch (error) {
    console.error("Error fetching room types:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error
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
        { id: 2, name: "Whole Day" }
      ]
    );
  } catch (error) {
    console.error("Error fetching booking types:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error
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
        { id: 2, name: "Non-Member" }
      ]
    );
  } catch (error) {
    console.error("Error fetching member types:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error
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
        "Capacity type, booking type, and member type are required"
      );
    }

    // Find room by capacity type
    const room = await MeetingRoom.findOne({
      where: { capacityType }
    });
    
    if (!room) {
      return res.error(
        httpStatus.NOT_FOUND,
        false,
        "Meeting room not found"
      );
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
        openTime: room.openTime,
        closeTime: room.closeTime,
        bookingType,
        memberType,
        capacityType,
        includesGST: bookingType === "Whole Day" ? true : false,
        note: bookingType === "Hourly" ? "GST will be added to the hourly rate" : "GST is included in the day rate"
      }
    );
  } catch (error) {
    console.error("Error fetching room pricing:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error
    );
  }
};

// Helper function to convert time from 12-hour to 24-hour format
const convertTo24Hour = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  
  return `${hours}:${minutes}`;
};

// Helper function to generate time slots
const generateTimeSlots = (openTime, closeTime, durationMinutes) => {
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  let currentHour = openHour;
  let currentMinute = openMinute;
  
  while (
    currentHour < closeHour || 
    (currentHour === closeHour && currentMinute < closeMinute)
  ) {
    const startHour = currentHour.toString().padStart(2, '0');
    const startMinute = currentMinute.toString().padStart(2, '0');
    
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
    
    const endHourStr = endHour.toString().padStart(2, '0');
    const endMinuteStr = endMinute.toString().padStart(2, '0');
    
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
    const { date, capacityType, duration = "30 Minutes" } = req.query;

    if (!date || !capacityType) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Date and capacity type are required"
      );
    }

    // Find room by capacity type
    const room = await MeetingRoom.findOne({
      where: { capacityType }
    });
    
    if (!room) {
      return res.error(
        httpStatus.NOT_FOUND,
        false,
        "Meeting room not found"
      );
    }

    // Find existing bookings for the date
    const existingBookings = await RoomBooking.findAll({
      where: {
        roomId: room.id,
        bookingDate: date,
        status: "confirmed"
      }
    });

    // Generate all possible time slots based on duration
    const openTime = room.openTime || "09:00 AM";
    const closeTime = room.closeTime || "06:30 PM";
    
    // Convert to 24-hour format for easier calculation
    const openHour = convertTo24Hour(openTime);
    const closeHour = convertTo24Hour(closeTime);
    
    // Duration in minutes - support both 30 min and 1 hour
    let durationMinutes = 30;
    if (duration === "1 Hour") durationMinutes = 60;
    
    const allTimeSlots = generateTimeSlots(openHour, closeHour, durationMinutes);
    
    // Mark booked slots
    const bookedSlots = [];
    existingBookings.forEach(booking => {
      if (booking.timeSlots && Array.isArray(booking.timeSlots)) {
        bookedSlots.push(...booking.timeSlots);
      }
    });
    
    // Filter out booked slots
    const availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

    return res.success(
      httpStatus.OK,
      true,
      "Available time slots fetched successfully",
      { 
        availableSlots,
        bookedSlots,
        openTime,
        closeTime,
        duration
      }
    );
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error
    );
  }
};

// Get available amenities
meetingRoomController.getAmenities = async (req, res) => {
  try {
    return res.success(
      httpStatus.OK,
      true,
      "Amenities fetched successfully",
      ["Tea", "Coffee", "Cookies"]
    );
  } catch (error) {
    console.error("Error fetching amenities:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error
    );
  }
};

// Book a meeting room
meetingRoomController.bookRoom = async (req, res) => {
  try {
    const { 
      capacityType,
      bookingDate,
      timeSlots,
      duration,
      bookingType,
      memberType,
      notes 
    } = req.body;

    // Get customer information from authenticated user
    const userName = req.user.username;
    const userEmail = req.user.email;
    const userPhone = req.user.mobile;

    if (!capacityType || !bookingDate || !bookingType || !memberType) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Required fields are missing"
      );
    }

    // Validate duration if provided for hourly bookings
    if (bookingType === "Hourly" && (!duration || !["30 Minutes", "1 Hour"].includes(duration))) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Duration must be either '30 Minutes' or '1 Hour' for hourly bookings"
      );
    }

    // Find room by capacity type
    const room = await MeetingRoom.findOne({
      where: { capacityType }
    });
    
    if (!room) {
      return res.error(
        httpStatus.NOT_FOUND,
        false,
        "Meeting room not found"
      );
    }

    // Calculate price based on booking type and member type
    let basePrice;
    if (bookingType === "Hourly") {
      basePrice = memberType === "Member" ? room.memberHourlyRate : room.hourlyRate;
    } else {
      basePrice = memberType === "Member" ? room.memberDayRate : room.dayRate;
    }

    // Calculate total amount
    let totalAmount;
    if (bookingType === "Hourly" && timeSlots && timeSlots.length > 0) {
      // For hourly bookings, calculate based on number of slots and duration
      const hourMultiplier = duration === "1 Hour" ? 1 : 0.5; // 30 min = 0.5 hour
      const totalHours = timeSlots.length * hourMultiplier;
      
      // Base price is per hour
      const subtotal = basePrice * totalHours;
      
      // Add GST (18%) for hourly bookings
      totalAmount = subtotal * 1.18;
    } else {
      // For whole day bookings, GST is already included
      totalAmount = basePrice;
    }

    // Check for availability if hourly booking
    if (bookingType === "Hourly" && timeSlots && timeSlots.length > 0) {
      const existingBookings = await RoomBooking.findAll({
        where: {
          roomId: room.id,
          bookingDate,
          status: "confirmed"
        }
      });

      // Check for time slot conflicts
      const bookedSlots = [];
      existingBookings.forEach(booking => {
        if (booking.timeSlots && Array.isArray(booking.timeSlots)) {
          bookedSlots.push(...booking.timeSlots);
        }
      });

      // Check if any requested slot is already booked
      const conflictingSlots = timeSlots.filter(slot => bookedSlots.includes(slot));
      if (conflictingSlots.length > 0) {
        return res.error(
          httpStatus.CONFLICT,
          false,
          `The following time slots are already booked: ${conflictingSlots.join(", ")}`
        );
      }
    }

    // Create booking with pending status
    const booking = await RoomBooking.create({
      roomId: room.id,
      username:userName,
      email:userEmail,
      mobile:userPhone,
      bookingDate,
      timeSlots: bookingType === "Hourly" ? timeSlots : null,
      duration: bookingType === "Hourly" ? duration : null,
      bookingType,
      memberType,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      status: "pending", // Set to pending until admin verifies
      notes
    });

    return res.success(
      httpStatus.CREATED,
      true,
      "Meeting room booked successfully. Your booking is pending admin verification.",
      {
        booking,
        roomName: room.name,
        roomType: room.capacityType,
        totalAmount: booking.totalAmount,
        paymentInstructions: "Please complete your payment to confirm your booking."
      }
    );
  } catch (error) {
    console.error("Error booking meeting room:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error
    );
  }
};

//  for admin to verify bookings
meetingRoomController.verifyBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    if (!bookingId) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Booking ID is required"
      );
    }
    
    // Find the booking
    const booking = await RoomBooking.findByPk(bookingId);
    
    if (!booking) {
      return res.error(
        httpStatus.NOT_FOUND,
        false,
        "Booking not found"
      );
    }
    
    // Update booking status to confirmed
    await booking.update({ status: "confirmed" });
    
    // Get room details
    const room = await MeetingRoom.findByPk(booking.roomId);
    
    return res.success(
      httpStatus.OK,
      true,
      "Booking verified successfully",
      booking
    );
  } catch (error) {
    console.error("Error verifying booking:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error",
      error
    );
  }
};

module.exports = meetingRoomController;