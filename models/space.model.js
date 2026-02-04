const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Space = sequelize.define('Space', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomNumber: {
    type:DataTypes.INTEGER,
    allowNull:false
  },
  cabinNumber:{
    type:DataTypes.CHAR,
    allowNull:false
  },
  space_name: {   // Executive Cabin, Private Cabin, etc
    type: DataTypes.STRING,
    allowNull: true,
  },
  seater: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  price: {
    type: DataTypes.CHAR,
    allowNull: false
  },
  gst: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18.00   // default 18% GST
  },
  finalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  availability: {
    type: DataTypes.ENUM('Available', 'Available Soon', 'Not Available'),
    allowNull:false
  },
  images: {
    type: DataTypes.JSON, 
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
},
{
   tableName: "spaces", 
   timestamps: true
});

module.exports = Space;
