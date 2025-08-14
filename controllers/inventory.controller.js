const { Space, AvailableDate } = require('../models');
const upload = require('../middlewares/upload.middleware');
const path = require('path');
const fs = require('fs');

const inventoryController = {};

// Middleware for handling space image uploads
inventoryController.uploadSpaceImages = upload.array('spaceImages', 5);

// Add new space
inventoryController.addSpace = async (req, res, next) => {
  try {
    // Validate required fields
    const { roomNumber, cabinNumber, price, availability, availableDates } = req.body;
    
    if (!roomNumber || !cabinNumber || !price) {
      return res.status(400).json({
        success: false,
        message: 'Room number, cabin number, and price are required'
      });
    }
    
    // Check if at least one image was uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one space image is required'
      });
    }
    
    // Process uploaded images
    const imagePaths = req.files.map(file => `/uploads/spaces/${file.filename}`);
    
    // Create space record
    const newSpace = await Space.create({
      roomNumber,
      cabinNumber,
      price,
      availability: availability || 'AVAILABLE',
      images: imagePaths
    });
    
    // Process available dates if provided
    if (availableDates && Array.isArray(JSON.parse(availableDates))) {
      const dates = JSON.parse(availableDates);
      const availableDateRecords = dates.map(date => ({
        date: new Date(date),
        spaceId: newSpace.id
      }));
      
      await AvailableDate.bulkCreate(availableDateRecords);
    }
    
    // Fetch the created space with its available dates
    const space = await Space.findByPk(newSpace.id, {
      include: [{ model: AvailableDate }]
    });
    
    res.status(201).json({
      success: true,
      message: 'Space added successfully',
      data: space
    });
  } catch (error) {
    next(error);
  }
};

// Get all spaces
inventoryController.getAllSpaces = async (req, res, next) => {
  try {
    const spaces = await Space.findAll({
      include: [{ model: AvailableDate }],
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
      include: [{ model: AvailableDate }]
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
      include: [{ model: AvailableDate }]
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

module.exports = inventoryController;