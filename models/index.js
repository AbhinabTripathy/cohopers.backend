const Space = require('./space.model');
const AvailableDate = require('./availableDate.model');
const User = require('./user.model');
const Booking = require('./booking.model');
const Kyc = require("./kyc.model");
const MeetingRoom = require("./meetingRoom.model");
const roomBooking = require("./roomBooking.model");
const teamMember = require("../models/teamMember.model")


// Space & AvailableDate
Space.hasMany(AvailableDate, { as: "availableDates", foreignKey: "spaceId" });
AvailableDate.belongsTo(Space, { as: "space", foreignKey: "spaceId" });
 
// Booking & User & Space
Booking.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(Booking, { foreignKey: "userId", as: "bookings" });


Booking.belongsTo(Space, { foreignKey: "spaceId", as: "space" });
Space.hasMany(Booking, { foreignKey: "spaceId", as: "bookings" })
// Booking & KYC
Booking.hasOne(Kyc, { foreignKey: "bookingId" });
Kyc.belongsTo(Booking, { foreignKey: "bookingId" });

//Booking & meetingRoom
roomBooking.belongsTo(MeetingRoom, {foreignKey: "roomId"});
MeetingRoom.hasMany(roomBooking, {foreignKey: "roomId"});


// RoomBooking & User
roomBooking.belongsTo(User, { foreignKey: "userId" });
User.hasMany(roomBooking, { foreignKey: "userId" });


module.exports = {
  Space,
  AvailableDate,
  User,
  Booking,
  Kyc,
  MeetingRoom,
  roomBooking,
  teamMember
};