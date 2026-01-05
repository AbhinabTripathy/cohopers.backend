const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Booking = sequelize.define("Booking", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "users",
      key: "id",
    },
  },
  spaceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "spaces",
      key: "id",
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  originalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  negotiatedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  negotiationRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  paymentScreenshot: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("Pending", "Confirm", "Rejected", "Notice Given"),
    defaultValue: "Pending",
  },
  //  For notice period 
  noticeGiven: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  noticeSubmittedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  noticePeriodDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
    validate: {
      min: 1,
      max: 365,
    },
  },
  noticePdfPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: "bookings",
  timestamps: true,
});

module.exports = Booking;
