"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("spaces", [
      { 
        space_name: "Executive Cabin", 
        seater: 3, 
        price: 2000, 
        gst: 18, 
        finalPrice: 2000 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/executive-3.jpg"]) 
      },
      { 
        space_name: "Executive Cabin", 
        seater: 5, 
        price: 3500, 
        gst: 18, 
        finalPrice: 3500 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/executive-5.jpg"]) 
      },
      { 
        space_name: "Executive Cabin", 
        seater: 8, 
        price: 5000, 
        gst: 18, 
        finalPrice: 5000 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/executive-8.jpg"]) 
      },
      { 
        space_name: "Private Cabin", 
        seater: 6, 
        price: 4000, 
        gst: 18, 
        finalPrice: 4000 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/private-6.jpg"]) 
      },
      { 
        space_name: "Private Cabin", 
        seater: 10, 
        price: 7000, 
        gst: 18, 
        finalPrice: 7000 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/private-10.jpg"]) 
      },
      { 
        space_name: "Premium Cabin", 
        seater: 12, 
        price: 10000, 
        gst: 18, 
        finalPrice: 10000 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/premium-12.jpg"]) 
      },
      { 
        space_name: "Premium Cabin", 
        seater: 15, 
        price: 12000, 
        gst: 18, 
        finalPrice: 12000 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/premium-15.jpg"]) 
      },
      { 
        space_name: "Corporate Cabin", 
        seater: 20, 
        price: 18000, 
        gst: 18, 
        finalPrice: 18000 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/corporate-20.jpg"]) 
      },
      { 
        space_name: "Corporate Cabin", 
        seater: 25, 
        price: 25000, 
        gst: 18, 
        finalPrice: 25000 * 1.18, 
        isActive: true, 
        images: JSON.stringify(["/uploads/spaces/corporate-25.jpg"]) 
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("spaces", null, {});
  }
};
