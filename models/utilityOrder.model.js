const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UtilityOrder = sequelize.define(
  "UtilityOrder",
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
    utilityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "utilities",
        key: "id",
      },
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
    spaceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "spaces",
        key: "id",
      },
    },
    isPersonal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isMonthlyPayment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    paid: {
      type: DataTypes.ENUM("Yes", "No", "Pending"),
      allowNull: false,
      defaultValue: "Pending",
    },
    // Print-service specific fields (null for non-print utilities)
    printFile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    printType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    colorMode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paperSize: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    orientation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    doubleSided: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    tableName: "utility_orders",
    timestamps: true,
  },
);

module.exports = UtilityOrder;
