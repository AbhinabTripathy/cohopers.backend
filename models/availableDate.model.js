const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Space = require('./space.model');

const AvailableDate = sequelize.define('AvailableDate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.JSON,
    allowNull: false
  },
  spaceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "spaces",
      key: 'id'
    }
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
   tableName: "available_dates", 
   timestamps: true
});


module.exports = AvailableDate;