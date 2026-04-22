const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CafeteriaItem = sequelize.define(
  "CafeteriaItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    item: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "cafeteria_items",
    timestamps: true,
  },
);

module.exports = CafeteriaItem;
