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
Space.hasMany(AvailableDate, { as: "availableDates", foreignKey: "spaceId", onDelete: "CASCADE" });
AvailableDate.belongsTo(Space, { as: "space", foreignKey: "spaceId" });


//  Booking & User & Space
User.hasMany(Booking, { foreignKey: "userId", as: "bookings", onDelete: "CASCADE" });
Booking.belongsTo(User, { foreignKey: "userId", as: "user" });

Space.hasMany(Booking, { foreignKey: "spaceId", as: "bookings", onDelete: "CASCADE" });
Booking.belongsTo(Space, { foreignKey: "spaceId", as: "space" });


//  KYC & Booking (each booking can have one KYC)
Booking.hasOne(Kyc, { foreignKey: "bookingId", as: "kyc", onDelete: "CASCADE" });
Kyc.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

//  KYC & User (each user can have one KYC)
User.hasOne(Kyc, { foreignKey: "userId", as: "kyc", onDelete: "CASCADE" });
Kyc.belongsTo(User, { foreignKey: "userId", as: "user" });


//  Team Members (each booking can have multiple team members)
Booking.hasMany(teamMember, { foreignKey: "bookingId", as: "teamMembers", onDelete: "CASCADE" });
teamMember.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });


//  Cafeteria Orders
User.hasMany(CafeteriaOrder, { foreignKey: "userId", as: 'orders', onDelete: "CASCADE" });
CafeteriaOrder.belongsTo(User, { foreignKey: "userId", as: 'user' });


//  Meeting Room & Room Booking
MeetingRoom.hasMany(roomBooking, { foreignKey: "meetingRoomId", as: "bookings", onDelete: "CASCADE" });
roomBooking.belongsTo(MeetingRoom, { foreignKey: "meetingRoomId", as: "meetingRoom" });

User.hasMany(roomBooking, { foreignKey: "userId", as: "roomBookings", onDelete: "CASCADE" });
roomBooking.belongsTo(User, { foreignKey: "userId", as: "user" });


// Export all models
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
