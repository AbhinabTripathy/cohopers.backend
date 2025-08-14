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
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  spaceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Space,
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
});

// Define relationship
Space.hasMany(AvailableDate, { foreignKey: 'spaceId' });
AvailableDate.belongsTo(Space, { foreignKey: 'spaceId' });

module.exports = AvailableDate;