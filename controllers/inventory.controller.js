const { Space, AvailableDate, Booking, teamMember } = require('../models');
const upload = require('../middlewares/upload.middleware');
const path = require('path');
const fs = require('fs');

const inventoryController = {};

// Middleware for handling space image uploads
inventoryController.uploadSpaceImages = upload.array('spaceImages', 5);


// Add new space
inventoryController.addSpace = async (req, res, next) => {
  try {
    const { space_name, seater, price, availability, availableDates,cabinNumber,roomNumber } = req.body;

    if (!space_name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Space name and price are required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one space image is required'
      });
    }

    const imagePaths = req.files.map(file => `/uploads/spaces/${file.filename}`);

    // Price with GST
    const gstRate = 0.18;
    const finalPrice = parseFloat(price) + (parseFloat(price) * gstRate);

    // Validate availability
    const validStatuses = ["Available", "Available Soon", "Not Available"];
    const finalAvailability = validStatuses.includes(availability) ? availability : "Available";

    // Create Space
    const newSpace = await Space.create({
      cabinNumber,
      roomNumber,
      space_name,
      seater: seater ? parseInt(seater) : null,
      price: parseFloat(price),
      gst: 18.00,
      finalPrice: finalPrice.toFixed(2),
      availability: finalAvailability,
      images: imagePaths
    });

    // Handle available dates
    let parsedDates = [];
    if (availableDates) {
      if (typeof availableDates === "string") {
        parsedDates = availableDates.split(",").map(d => d.trim());
      } else if (Array.isArray(availableDates)) {
        parsedDates = availableDates;
      }
    }

    if (parsedDates.length > 0) {
      const dateRecords = parsedDates.map(date => ({
        spaceId: newSpace.id,
        date
      }));
      await AvailableDate.bulkCreate(dateRecords);
    }

    res.status(201).json({
      success: true,
      message: 'Space added successfully with GST and available dates',
      data: await Space.findByPk(newSpace.id, {
        include: [{ model: AvailableDate, as: "availableDates" }]
      })
    });

  } catch (error) {
    console.error(error);
    next(error);
  }
};


// Get all spaces
inventoryController.getAllSpaces = async (req, res, next) => {
  try {
    const spaces = await Space.findAll({
      include: [{ model: AvailableDate ,as:"availableDates" }],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      message: 'Spaces retrieved successfully',
      data: spaces
    });
  } catch (error) {
    next(error);
  }
};

// Get space by ID
inventoryController.getSpaceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const space = await Space.findByPk(id, {
      include: [{ model: AvailableDate ,as:"availableDates"}]
    });
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Space retrieved successfully',
      data: space
    });
  } catch (error) {
    next(error);
  }
};

// Update space
inventoryController.updateSpace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomNumber, cabinNumber, price, availability, availableDates } = req.body;
    
    // Check if space exists
    const space = await Space.findByPk(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }
    
    // Update space details
    const updateData = {};
    if (roomNumber) updateData.roomNumber = roomNumber;
    if (cabinNumber) updateData.cabinNumber = cabinNumber;
    if (price) updateData.price = price;
    if (availability) updateData.availability = availability;
    
    // Process new images if uploaded
    if (req.files && req.files.length > 0) {
      // Delete old images from storage
      const oldImages = space.images;
      oldImages.forEach(imagePath => {
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
      
      // Add new image paths
      updateData.images = req.files.map(file => `/uploads/spaces/${file.filename}`);
    }
    
    // Update space record
    await space.update(updateData);
    
    // Update available dates if provided
    if (availableDates && Array.isArray(JSON.parse(availableDates))) {
      // Delete existing dates
      await AvailableDate.destroy({ where: { spaceId: id } });
      
      // Add new dates
      const dates = JSON.parse(availableDates);
      const availableDateRecords = dates.map(date => ({
        date: new Date(date),
        spaceId: id
      }));
      
      await AvailableDate.bulkCreate(availableDateRecords);
    }
    
    // Fetch updated space with available dates
    const updatedSpace = await Space.findByPk(id, {
      include: [{ model: AvailableDate ,as:"availableDates" }]
    });
    
    res.status(200).json({
      success: true,
      message: 'Space updated successfully',
      data: updatedSpace
    });
  } catch (error) {
    next(error);
  }
};

// Delete space
inventoryController.deleteSpace = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if space exists
    const space = await Space.findByPk(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }
    
    // Delete images from storage
    const images = space.images;
    images.forEach(imagePath => {
      const fullPath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });
    
    // Delete available dates
    await AvailableDate.destroy({ where: { spaceId: id } });
    
    // Delete space
    await space.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Space deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// add team member by who will book space
inventoryController.addTeamMember = async (req, res) => {
  try {
    const { fullName, email, phone, role, deskNumber } = req.body;

    // Ensure user is logged in
    const userId = req.user.id;

    // Find the user's active monthly space booking
    const booking = await Booking.findOne({
      where: { userId, status: "Confirm" } // confirmed monthly booking
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "No active confirmed booking found for this user"
      });
    }

    // Handle photo upload
    let photoPath = null;
    if (req.file) {
      photoPath = `/uploads/team-members/${req.file.filename}`;
    }

    // Create team member entry
    const member = await teamMember.create({
      bookingId: booking.id,
      fullName,
      email,
      phone,
      role,
      deskNumber,
      photo: photoPath,
    });

    return res.status(201).json({
      success: true,
      message: "Team member added successfully",
      data: member
    });

  } catch (error) {
    console.error("Error adding team member:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};




module.exports = inventoryController;