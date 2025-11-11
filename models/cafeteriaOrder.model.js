const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./user.model");

const CafeteriaOrder = sequelize.define(
  "CafeteriaOrder",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    orderType: {
      type: DataTypes.ENUM("Coffee", "Tea"),
      allowNull: false,
    },
    itemName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    paymentScreenshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    utrNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Pending", "Confirmed", "Delivered", "Cancelled"),
      defaultValue: "Pending",
    },
  },
  {
    tableName: "cafeteria_orders",
    timestamps: true,
  }
);

module.exports = CafeteriaOrder;