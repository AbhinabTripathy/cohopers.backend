const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Utility = sequelize.define(
  "Utility",
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
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    availability: {
      type: DataTypes.ENUM("Available", "Not Available"),
      defaultValue: "Available",
    },
  },
  {
    tableName: "utilities",
    timestamps: true,
  },
);

module.exports = Utility;
