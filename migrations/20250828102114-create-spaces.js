'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("spaces", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      space_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      seater: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      gst: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 18.0
      },
      finalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      availability: {
        type: Sequelize.ENUM('Available', 'Available Soon', 'Not Available'),
        allowNull: false
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW")
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW")
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("spaces");
  }
};
