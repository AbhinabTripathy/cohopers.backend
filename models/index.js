const Space = require('./space.model');
const AvailableDate = require('./availableDate.model');
const User = require('./user.model');
const Booking = require('./booking.model');
const Kyc = require("./kyc.model");
const MeetingRoom = require("./meetingRoom.model");



// Space & AvailableDate
Space.hasMany(AvailableDate, { as: "availableDates", foreignKey: "spaceId" });
AvailableDate.belongsTo(Space, { as: "space", foreignKey: "spaceId" });
 
// Booking & User & Space
Booking.belongsTo(User, { foreignKey: "userId" });
Booking.belongsTo(Space, { foreignKey: "spaceId" });

// Booking & KYC
Booking.hasOne(Kyc, { foreignKey: "bookingId" });
Kyc.belongsTo(Booking, { foreignKey: "bookingId" });




module.exports = {
  Space,
  AvailableDate,
  User,
  Booking,
  Kyc,
  MeetingRoom
};