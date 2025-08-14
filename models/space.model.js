const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Space = sequelize.define('Space', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cabinNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  availability: {
    type: DataTypes.ENUM('AVAILABLE', 'AVAILABLE_SOON', 'NOT_AVAILABLE'),
    defaultValue: 'AVAILABLE'
  },
  images: {
    type: DataTypes.JSON, // Store array of image paths
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = Space;