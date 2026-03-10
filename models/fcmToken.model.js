const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FCMToken = sequelize.define('FCMToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  role: { type: DataTypes.ENUM('user','admin'), allowNull: false, defaultValue: 'user' },
  token: { type: DataTypes.STRING(512), allowNull: false, unique: true },
  deviceId: { type: DataTypes.STRING, allowNull: true },
  deviceType: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'fcm_tokens',
  timestamps: true
});

module.exports = FCMToken;