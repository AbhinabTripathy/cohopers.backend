// models/teamMember.model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Booking = require("./booking.model");

const TeamMember = sequelize.define("TeamMember", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Booking,
      key: "id",
    },
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("Admin", "Member"),
    defaultValue: "Member",
  },
  deskNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  photo: {
    type: DataTypes.STRING, // store file path
    allowNull: true,
  }
}, {
  timestamps: true,
  tableName: "team_members"
});

// Associations
Booking.hasMany(TeamMember, { foreignKey: "bookingId" });
TeamMember.belongsTo(Booking, { foreignKey: "bookingId" });

module.exports = TeamMember;
