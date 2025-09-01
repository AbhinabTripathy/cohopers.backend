const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MeetingRoom = sequelize.define(
  "MeetingRoom",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    capacityType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    hourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    dayRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    memberHourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    memberDayRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    openTime: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "09:00 AM",
    },
    closeTime: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "06:30 PM",
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
  }
);

sequelize
  .sync({ alter: false })
  .then(() => {
    console.log("MeetingRoom table created successfully!");
  })
  .catch((error) => {
    console.error("Unable to create table: ", error);
  });

module.exports = MeetingRoom;