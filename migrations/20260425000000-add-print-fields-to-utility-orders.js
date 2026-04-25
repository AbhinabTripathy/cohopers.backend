"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("utility_orders", "printFile", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "paid",
    });
    await queryInterface.addColumn("utility_orders", "printType", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "printFile",
    });
    await queryInterface.addColumn("utility_orders", "colorMode", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "printType",
    });
    await queryInterface.addColumn("utility_orders", "paperSize", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "colorMode",
    });
    await queryInterface.addColumn("utility_orders", "orientation", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "paperSize",
    });
    await queryInterface.addColumn("utility_orders", "doubleSided", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      after: "orientation",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("utility_orders", "doubleSided");
    await queryInterface.removeColumn("utility_orders", "orientation");
    await queryInterface.removeColumn("utility_orders", "paperSize");
    await queryInterface.removeColumn("utility_orders", "colorMode");
    await queryInterface.removeColumn("utility_orders", "printType");
    await queryInterface.removeColumn("utility_orders", "printFile");
  },
};
