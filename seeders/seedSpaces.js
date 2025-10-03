const Space = require('../models/space.model');

async function seedSpaces() {
  try {
    // Check if spaces already exist
    const existingSpaces = await Space.findAll();
    
    if (existingSpaces.length > 0) {
      console.log('Spaces already exist in database');
      return;
    }
    
    // Create spaces based on the data from spaces-seeder.js
    await Space.bulkCreate([
      { 
        roomNumber: 101,
        cabinNumber: 'A',
        space_name: "Executive Cabin", 
        seater: 3, 
        price: 2000, 
        gst: 18, 
        finalPrice: 2000 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/executive-3.jpg"]
      },
      { 
        roomNumber: 102,
        cabinNumber: 'B',
        space_name: "Executive Cabin", 
        seater: 5, 
        price: 3500, 
        gst: 18, 
        finalPrice: 3500 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/executive-5.jpg"]
      },
      { 
        roomNumber: 103,
        cabinNumber: 'C',
        space_name: "Executive Cabin", 
        seater: 8, 
        price: 5000, 
        gst: 18, 
        finalPrice: 5000 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/executive-8.jpg"]
      },
      { 
        roomNumber: 201,
        cabinNumber: 'A',
        space_name: "Private Cabin", 
        seater: 6, 
        price: 4000, 
        gst: 18, 
        finalPrice: 4000 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/private-6.jpg"]
      },
      { 
        roomNumber: 202,
        cabinNumber: 'B',
        space_name: "Private Cabin", 
        seater: 10, 
        price: 7000, 
        gst: 18, 
        finalPrice: 7000 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/private-10.jpg"]
      },
      { 
        roomNumber: 301,
        cabinNumber: 'A',
        space_name: "Premium Cabin", 
        seater: 12, 
        price: 10000, 
        gst: 18, 
        finalPrice: 10000 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/premium-12.jpg"]
      },
      { 
        roomNumber: 302,
        cabinNumber: 'B',
        space_name: "Premium Cabin", 
        seater: 15, 
        price: 12000, 
        gst: 18, 
        finalPrice: 12000 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/premium-15.jpg"]
      },
      { 
        roomNumber: 401,
        cabinNumber: 'A',
        space_name: "Corporate Cabin", 
        seater: 20, 
        price: 18000, 
        gst: 18, 
        finalPrice: 18000 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/corporate-20.jpg"]
      },
      { 
        roomNumber: 402,
        cabinNumber: 'B',
        space_name: "Corporate Cabin", 
        seater: 25, 
        price: 25000, 
        gst: 18, 
        finalPrice: 25000 * 1.18, 
        isActive: true,
        availability: 'Available',
        images: ["/uploads/spaces/corporate-25.jpg"]
      },
    ]);

    console.log('Spaces seeded successfully');
  } catch (error) {
    console.error('Error seeding spaces:', error);
  }
}

module.exports = seedSpaces;