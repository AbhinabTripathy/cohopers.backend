const Space = require('./space.model');
const AvailableDate = require('./availableDate.model');
const User = require('./user.model');
const Booking = require('./booking.model');
const Kyc = require("./kyc.model");
const MeetingRoom = require("./meetingRoom.model");
const roomBooking = require("./roomBooking.model");
const teamMember = require("../models/teamMember.model");
const CafeteriaOrder = require("./cafeteriaOrder.model");

// Space & AvailableDate
Space.hasMany(AvailableDate, { as: "availableDates", foreignKey: "spaceId" });
AvailableDate.belongsTo(Space, { as: "space", foreignKey: "spaceId" });
 
// Booking & User & Space
Booking.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(Booking, { foreignKey: "userId", as: "bookings" });

Booking.belongsTo(Space, { foreignKey: "spaceId", as: "space" });
Space.hasMany(Booking, { foreignKey: "spaceId", as: "bookings" });

// Kyc & Booking
Kyc.belongsTo(Booking, { foreignKey: "bookingId" });
Booking.hasOne(Kyc, { foreignKey: "bookingId" });

// User & CafeteriaOrder relationship is defined in the model file
User.hasMany(CafeteriaOrder, { foreignKey: "userId", as: 'orders' });
CafeteriaOrder.belongsTo(User, { foreignKey: "userId", as: 'user' });

// Meeting room booking & User
User.hasMany(roomBooking, { foreignKey: "userId", as: "roomBookings" });
roomBooking.belongsTo(User, { foreignKey: "userId", as: "user" });

module.exports = {
  Space,
  AvailableDate,
  User,
  Booking,
  Kyc,
  MeetingRoom,
  roomBooking,
  teamMember,
  CafeteriaOrder
};