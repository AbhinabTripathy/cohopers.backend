"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("bookings", "depositedAmount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      after: "noticePdfPath",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("bookings", "depositedAmount");
  },
};
