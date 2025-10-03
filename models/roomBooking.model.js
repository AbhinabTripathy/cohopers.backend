const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const MeetingRoom = require("./meetingRoom.model");

const RoomBooking = sequelize.define(
  "meetingRoomBooking",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: MeetingRoom,
        key: "id",
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bookingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    timeSlots: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bookingType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    memberType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    paymentScreenshot: {
      type:DataTypes.STRING,
      allowNull:false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
      model: "users", 
      key: "id",
  },
},

  },
  {
    timestamps: true,
  }
);

// Define relationships
MeetingRoom.hasMany(RoomBooking, { foreignKey: "roomId" });
RoomBooking.belongsTo(MeetingRoom, { foreignKey: "roomId" });



module.exports = RoomBooking;