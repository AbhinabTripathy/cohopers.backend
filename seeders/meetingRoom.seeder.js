const MeetingRoom = require('../models/meetingRoom.model');

async function seedMeetingRooms() {
  try {
    // Check if rooms already exist
    const existingRooms = await MeetingRoom.findAll();
    
    if (existingRooms.length > 0) {
      console.log('Meeting rooms already exist in database');
      return;
    }
    
    // Create fixed company meeting rooms
    await MeetingRoom.create({
      name: "Small Conference Room",
      capacityType: "4-6 Seater",
      hourlyRate: 500, // Non-member hourly rate
      dayRate: 2300,   // Non-member whole day rate (Including GST)
      memberHourlyRate: 400, // Member hourly rate
      memberDayRate: 1800,   // Member whole day rate (Including GST)
      description: "Small conference room for team meetings",
      openTime: "09:00 AM",
      closeTime: "06:30 PM",
      status: true
    });
    
    await MeetingRoom.create({
      name: "Large Conference Room",
      capacityType: "10-12 Seater",
      hourlyRate: 500, // Non-member hourly rate
      dayRate: 2300,   // Non-member whole day rate (Including GST)
      memberHourlyRate: 400, // Member hourly rate
      memberDayRate: 1800,   // Member whole day rate (Including GST)
      description: "Large conference room for board meetings",
      openTime: "09:00 AM",
      closeTime: "06:30 PM",
      status: true
    });

    console.log('Meeting rooms seeded successfully');
  } catch (error) {
    console.error('Error seeding meeting rooms:', error);
  }
}

module.exports = seedMeetingRooms;