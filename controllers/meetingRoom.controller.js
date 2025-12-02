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
        pricePerThirtyMin: memberType === "Member" ? price / 2 : null, // Only for members
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
    const { date, capacityType, memberType } = req.query;

    if (!date || !capacityType || !memberType) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Date, Capacity & Member type are required"
      );
    }

    // Find room by capacity type
    const room = await MeetingRoom.findOne({ where: { capacityType } });
    if (!room) {
      return res.error(httpStatus.NOT_FOUND, false, "Meeting room not found");
    }

    // Include both 'pending' and 'confirmed' so slots are blocked once a user books & uploads payment.
    // If you don't want to block on pending, change this array to ['confirmed'] only.
    const bookedStatuses = ['pending', 'confirmed'];

    const existingBookings = await RoomBooking.findAll({
      where: {
        roomId: room.id,
        bookingDate: date,
        status: { [Op.in]: bookedStatuses }
      }
    });

    // Generate all possible time slots (assumes generateTimeSlots returns strings like "09:00 - 09:30")
    let openTime = room.openTime || "09:00 AM";
    let closeTime = room.closeTime || "06:30 PM";

    // If non-member must see 1-hour slots adjust duration and (optionally) closeTime
    let durationMinutes = 30;
    if (String(memberType).toLowerCase().includes('non')) {
      durationMinutes = 60;
      // If you want non-members to see closeTime as 06:00 rather than 06:30:
      if (closeTime === "06:30 PM") closeTime = "06:00 PM";
    }

    const openHour = convertTo24Hour(openTime);
    const closeHour = convertTo24Hour(closeTime);
    const allTimeSlots = generateTimeSlots(openHour, closeHour, durationMinutes);

    // Collect booked slots from DB
    const bookedSlotsRaw = existingBookings.flatMap(b => b.timeSlots || []);

    // Normalization helper: remove spaces so "09:00 - 10:00" and "09:00-10:00" compare equal
    const normalize = s => (s || '').toString().replace(/\s+/g, '');

    const bookedSet = new Set(bookedSlotsRaw.map(normalize));

    // Filter out booked slots using normalized comparison
    const availableSlots = allTimeSlots.filter(slot => !bookedSet.has(normalize(slot)));

    return res.success(
      httpStatus.OK,
      true,
      "Available time slots fetched successfully",
      {
        availableSlots,
        bookedSlots: [...bookedSet].map(s => {
          // convert back to readable format (insert space around dash) if you want
          return s.replace('-', ' - ');
        }),
        openTime,
        closeTime,
        slotDuration: `${durationMinutes} Minutes`,
        memberType
      }
    );
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    return res.error(httpStatus.INTERNAL_SERVER_ERROR, false, "Internal server error", error);
  }
};

// Get available amenities
meetingRoomController.getAmenities = async (req, res) => {
  try {
    return res.success(
      httpStatus.OK,
      true,
      "Amenities fetched successfully",
      ["Tea", "Coffee",]
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

// Book a meeting room & upload payment screenshot
meetingRoomController.bookRoom = async (req, res) => {
  try {
    const { capacityType, bookingDate, timeSlots:timeSlotString, duration, bookingType, memberType, notes, gst } = req.body;
    // Parse timeSlots from string to array if it's not already an array
    let timeSlots = timeSlotString;
    if (timeSlotString && typeof timeSlotString === 'string') {
      try {
        timeSlots = JSON.parse(timeSlotString);
      } catch (e) {
        // If it's a comma-separated string, convert to array
        timeSlots = timeSlotString.split(',').map(slot => slot.trim());
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
        "Unauthorized: missing or invalid token"
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
        "Required fields are missing"
      );
    }
    
    // Different validation for members vs non-members
    if (memberType !== "Member") {
      // Non-members must provide ID proof
      if (!req.files || !req.files.idProof) {
        return res.error(
          httpStatus.BAD_REQUEST,
          false,
          "ID proof is required for non-members"
        );
      }
      
      // Non-members must provide payment screenshot
      if (!req.files || !req.files.paymentScreenshot) {
        return res.error(
          httpStatus.BAD_REQUEST,
          false,
          "Payment screenshot is required for non-members"
        );
      }
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
      basePrice = parseInt(memberType === "Member" ? room.memberHourlyRate : room.hourlyRate);
    } else {
      basePrice = parseInt(memberType === "Member" ? room.memberDayRate : room.dayRate);
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
      status: memberType === "Member" ? "confirmed" : "pending", // Auto-confirm for members
      notes,
      gst: gst || null
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
      bookingData.paymentScreenshot = "member-no-payment-required";
    }
    
    // Create booking
    const booking = await RoomBooking.create(bookingData);
    
    const responseMessage = memberType === "Member" 
      ? "Meeting room booked successfully. Your booking is confirmed." 
      : "Meeting room booked successfully. Your booking is pending admin verification.";
    
    return res.success(
      httpStatus.CREATED,
      true,
      responseMessage,
      {
        booking,
        roomName: room.name,
        roomType: room.capacityType,
        totalAmount: booking.totalAmount,
        status: booking.status
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
     const { status } = req.body; 
     
     if (!bookingId) { 
       return res.error( 
         httpStatus.BAD_REQUEST, 
         false, 
         "Booking ID is required" 
       ); 
     } 
     
     if (!status || !['Confirm', 'Reject'].includes(status)) {
       return res.error(
         httpStatus.BAD_REQUEST,
         false,
         "Status must be either 'Confirm' or 'Reject'"
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
     
     // Update booking status based on request body
     await booking.update({ status }); 
     
     // Get room details 
     const room = await MeetingRoom.findByPk(booking.roomId); 
     
     const message = status === 'confirmed' ? "Booking confirmed successfully" : "Booking cancelled successfully";
     
     return res.success( 
       httpStatus.OK, 
       true, 
       message, 
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

// Whole-day availability by month (free vs booked days)
meetingRoomController.getAvailableDays = async (req, res) => {
  try {
    const { capacityType, year, month } = req.query;

    if (!capacityType || !year || !month) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "capacityType, year and month are required"
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
    const bookedStatuses = ['pending', 'confirmed'];

    const bookings = await RoomBooking.findAll({
      where: {
        roomId: room.id,
        bookingDate: { [Op.between]: [startStr, endStr] },
        status: { [Op.in]: bookedStatuses }
      },
      attributes: ['bookingDate', 'bookingType', 'timeSlots']
    });

    const bookedDateSet = new Set(bookings.map(b => b.bookingDate));

    const freeDates = [];
    const bookedDates = [];

    for (let d = 1; d <= lastDay; d++) {
      const dateObj = new Date(y, m - 1, d);
      const dateStr = dateObj.toISOString().slice(0, 10);
      if (bookedDateSet.has(dateStr)) {
        bookedDates.push(dateStr);
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
        bookedDates
      }
    );
  } catch (error) {
    console.error("Error fetching available days:", error);
    return res.error(httpStatus.INTERNAL_SERVER_ERROR, false, "Internal server error", error);
  }
};

module.exports = meetingRoomController;