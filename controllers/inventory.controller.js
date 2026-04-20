const { Space, AvailableDate, Booking, teamMember, Utility, UtilityOrder, User } = require("../models");
const { Op } = require("sequelize");
const { sendPushToTopic } = require("../utils/helper");
const upload = require("../middlewares/upload.middleware");
const path = require("path");
const fs = require("fs");

const inventoryController = {};

// Middleware for handling space image uploads
inventoryController.uploadSpaceImages = upload("spaces").array(
  "spaceImages",
  5,
);

// Add new space
inventoryController.addSpace = async (req, res, next) => {
  try {
    const {
      spaceName,
      seater,
      price,
      availability,
      availableDates,
      cabinNumber,
      roomNumber,
    } = req.body;

    if (!spaceName || !price) {
      return res.status(400).json({
        success: false,
        message: "Space name and price are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one space image is required",
      });
    }

    const imagePaths = req.files.map(
      (file) => `/uploads/spaces/${file.filename}`,
    );

    // Price with GST
    const gstRate = 0.18;
    const finalPrice = parseFloat(price) + parseFloat(price) * gstRate;

    // Validate availability
    const validStatuses = ["Available", "Available Soon", "Not Available"];
    const finalAvailability = validStatuses.includes(availability)
      ? availability
      : "Available";

    // Create Space
    const newSpace = await Space.create({
      cabinNumber,
      roomNumber,
      spaceName,
      seater: seater ? parseInt(seater) : null,
      price: parseFloat(price),
      gst: 18.0,
      finalPrice: finalPrice.toFixed(2),
      availability: finalAvailability,
      images: imagePaths,
    });

    // Handle available dates
    let parsedDates = [];
    if (availableDates) {
      if (typeof availableDates === "string") {
        const s = availableDates.trim();
        if (s.startsWith("[") && s.endsWith("]")) {
          try {
            parsedDates = JSON.parse(s);
          } catch {
            parsedDates = s
              .replace(/^\[/, "")
              .replace(/\]$/, "")
              .split(",")
              .map((d) =>
                d
                  .trim()
                  .replace(/^"+|"+$/g, "")
                  .replace(/^'+|'+$/g, ""),
              )
              .filter(Boolean);
          }
        } else {
          parsedDates = s
            .split(",")
            .map((d) =>
              d
                .trim()
                .replace(/^"+|"+$/g, "")
                .replace(/^'+|'+$/g, ""),
            )
            .filter(Boolean);
        }
      } else if (Array.isArray(availableDates)) {
        parsedDates = availableDates;
      }
    }

    if (parsedDates.length > 0) {
      await AvailableDate.create({ spaceId: newSpace.id, date: parsedDates });
    }

    res.status(201).json({
      success: true,
      message: "Space added successfully with GST and available dates",
      data: await Space.findByPk(newSpace.id, {
        include: [{ model: AvailableDate, as: "availableDates" }],
      }),
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
      include: [
        { model: AvailableDate, as: "availableDates", required: false },
      ],
      order: [["createdAt", "DESC"]],
    });

    const items = spaces.map((sp) => {
      const s = sp.toJSON();
      const imagesStr =
        typeof s.images === "string"
          ? s.images
          : JSON.stringify(s.images || []);
      const availableDates = Array.isArray(s.availableDates)
        ? s.availableDates.map((d) => {
            const dj = typeof d.toJSON === "function" ? d.toJSON() : d;
            const dateStr =
              typeof dj.date === "string"
                ? dj.date
                : JSON.stringify(dj.date || []);
            return {
              id: dj.id,
              date: dateStr,
              spaceId: dj.spaceId,
              createdAt: dj.createdAt,
              updatedAt: dj.updatedAt,
            };
          })
        : [];
      return {
        id: s.id,
        roomNumber: s.roomNumber,
        cabinNumber: s.cabinNumber,
        spaceName: s.spaceName,
        seater: s.seater,
        price: s.price,
        gst: s.gst,
        finalPrice: s.finalPrice,
        isActive: s.isActive,
        availability: s.availability,
        images: imagesStr,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        availableDates,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Spaces retrieved successfully",
      data: items,
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
      include: [{ model: AvailableDate, as: "availableDates" }],
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        message: "Space not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Space retrieved successfully",
      data: space,
    });
  } catch (error) {
    next(error);
  }
};

// Update space
inventoryController.updateSpace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomNumber, cabinNumber, price, availability, availableDates } =
      req.body;

    // Check if space exists
    const space = await Space.findByPk(id);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: "Space not found",
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
      oldImages.forEach((imagePath) => {
        const fullPath = path.join(__dirname, "..", imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });

      // Add new image paths
      updateData.images = req.files.map(
        (file) => `/uploads/spaces/${file.filename}`,
      );
    }

    // Update space record
    await space.update(updateData);

    // Update available dates if provided
    if (availableDates && Array.isArray(JSON.parse(availableDates))) {
      // Delete existing dates
      await AvailableDate.destroy({ where: { spaceId: id } });

      // Add new dates
      const dates = JSON.parse(availableDates);
      const availableDateRecords = dates.map((date) => ({
        date: new Date(date),
        spaceId: id,
      }));

      await AvailableDate.bulkCreate(availableDateRecords);
    }

    // Fetch updated space with available dates
    const updatedSpace = await Space.findByPk(id, {
      include: [{ model: AvailableDate, as: "availableDates" }],
    });

    res.status(200).json({
      success: true,
      message: "Space updated successfully",
      data: updatedSpace,
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
        message: "Space not found",
      });
    }

    // Delete images from storage
    const images = space.images;
    images.forEach((imagePath) => {
      const fullPath = path.join(__dirname, "..", imagePath);
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
      message: "Space deleted successfully",
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
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed - user not found in request",
      });
    }

    const userId = req.user.id;
    console.log("User ID from token:", userId);

    // Find user's active confirmed booking
    const booking = await Booking.findOne({
      where: { userId, status: "Confirm" },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "No active confirmed booking found for this user",
      });
    }

    // Handle photo upload
    let photoPath = null;
    if (req.file) {
      photoPath = `/uploads/team-members/${req.file.filename}`;
    }

    // Create team member
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
      data: member,
    });
  } catch (error) {
    console.error("Error adding team member:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all team members for a booking
inventoryController.getTeamMembers = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    // Check if booking exists and belongs to the user
    const booking = await Booking.findOne({
      where: { id: bookingId, userId: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you don't have permission",
      });
    }

    // Get team members
    const teamMembers = await teamMember.findAll({
      where: { bookingId },
    });

    return res.status(200).json({
      success: true,
      message: "Team members retrieved successfully",
      data: teamMembers,
    });
  } catch (error) {
    console.error("Error getting team members:", error);
    next(error);
  }
};

// Update a team member
inventoryController.updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, email, phoneNumber, role, deskNumber } = req.body;

    // Find team member and check if it belongs to user's booking
    const TeamMember = await teamMember.findOne({
      where: { id },
      include: [
        {
          model: Booking,
          where: { userId: req.user.id },
        },
      ],
    });

    if (!TeamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found or you don't have permission",
      });
    }

    // Update team member
    await TeamMember.update({
      fullName,
      email,
      phoneNumber,
      role,
      deskNumber,
    });

    return res.status(200).json({
      success: true,
      message: "Team member updated successfully",
      data: TeamMember,
    });
  } catch (error) {
    console.error("Error updating team member:", error);
    next(error);
  }
};

// Delete a team member
inventoryController.deleteTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find team member and check if it belongs to user's booking
    const TeamMember = await teamMember.findOne({
      where: { id },
      include: [
        {
          model: Booking,
          where: { userId: req.user.id },
        },
      ],
    });

    if (!TeamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found or you don't have permission",
      });
    }

    // delete team members
    await TeamMember.destroy();

    return res.status(200).json({
      success: true,
      message: "Team member deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting team member:", error);
    next(error);
  }
};

// Admin endpoint to get all team members across all bookings
inventoryController.getAllTeamMembers = async (req, res, next) => {
  try {
    const teamMembers = await teamMember.findAll({
      include: [
        {
          model: Booking,
          include: [
            {
              model: Space,
              as: "space",
              attributes: ["roomNumber", "cabinNumber", "spaceName"],
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "All team members retrieved successfully",
      data: teamMembers,
    });
  } catch (error) {
    console.error("Error getting all team members:", error);
    next(error);
  }
};

// ─── Utilities ───────────────────────────────────────────────────────────────

// Add a new utility (admin only)
inventoryController.addUtility = async (req, res, next) => {
  try {
    const { name, category, price, description, availability } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, category and price are required",
      });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    const validAvailability = ["Available", "Not Available"];
    const finalAvailability = validAvailability.includes(availability)
      ? availability
      : "Available";

    const utility = await Utility.create({
      name: name.trim(),
      category: category.trim(),
      price: parsedPrice,
      description: description ? description.trim() : null,
      availability: finalAvailability,
    });

    return res.status(201).json({
      success: true,
      message: "Utility added successfully",
      data: utility,
    });
  } catch (error) {
    console.error("Error adding utility:", error);
    next(error);
  }
};

// Update an existing utility (admin only)
inventoryController.updateUtility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, availability } = req.body;

    const utility = await Utility.findByPk(id);
    if (!utility) {
      return res.status(404).json({
        success: false,
        message: "Utility not found",
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid positive number",
        });
      }
      updateData.price = parsedPrice;
    }
    if (availability !== undefined) {
      const validAvailability = ["Available", "Not Available"];
      if (!validAvailability.includes(availability)) {
        return res.status(400).json({
          success: false,
          message: "Availability must be 'Available' or 'Not Available'",
        });
      }
      updateData.availability = availability;
    }

    await utility.update(updateData);

    return res.status(200).json({
      success: true,
      message: "Utility updated successfully",
      data: utility,
    });
  } catch (error) {
    console.error("Error updating utility:", error);
    next(error);
  }
};

// Get all utilities
inventoryController.getAllUtilities = async (req, res, next) => {
  try {
    const utilities = await Utility.findAll({ order: [["createdAt", "DESC"]] });
    return res.status(200).json({
      success: true,
      message: "Utilities retrieved successfully",
      data: utilities,
    });
  } catch (error) {
    console.error("Error fetching utilities:", error);
    next(error);
  }
};

// Get utility by id
inventoryController.getUtilityById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const utility = await Utility.findByPk(id);
    if (!utility) {
      return res.status(404).json({
        success: false,
        message: "Utility not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Utility retrieved successfully",
      data: utility,
    });
  } catch (error) {
    console.error("Error fetching utility:", error);
    next(error);
  }
};

// Delete utility
inventoryController.deleteUtility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const utility = await Utility.findByPk(id);
    if (!utility) {
      return res.status(404).json({
        success: false,
        message: "Utility not found",
      });
    }
    await utility.destroy();
    return res.status(200).json({
      success: true,
      message: "Utility deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting utility:", error);
    next(error);
  }
};

// ─── Utility Orders ──────────────────────────────────────────────────────────

// Place a utility order (visitor or member)
inventoryController.placeUtilityOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    let {
      orders,
      specialInstructions,
      utrNumber,
      isPersonal,
      isMonthlyPayment,
    } = req.body;

    // Parse orders if sent as a JSON string (form-data)
    if (typeof orders === "string") {
      try {
        orders = JSON.parse(orders);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON format for orders",
        });
      }
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Orders array is required",
      });
    }

    // Resolve spaceId from active booking (visitors won't have one — that's fine)
    const tzAdjusted = new Date(
      Date.now() - new Date().getTimezoneOffset() * 60000,
    );
    const today = tzAdjusted.toISOString().slice(0, 10);

    let currentSpaceId = req.body.spaceId ? Number(req.body.spaceId) : null;

    if (!currentSpaceId) {
      const activeBooking = await Booking.findOne({
        where: {
          userId,
          status: "Confirm",
          startDate: { [Op.lte]: today },
          endDate: { [Op.gte]: today },
        },
        order: [["startDate", "DESC"]],
      });

      if (activeBooking) {
        currentSpaceId = activeBooking.spaceId;
      } else {
        const latestBooking = await Booking.findOne({
          where: { userId, status: "Confirm" },
          order: [["endDate", "DESC"]],
        });
        currentSpaceId = latestBooking ? latestBooking.spaceId : null;
      }
    }

    const isMonthly = isMonthlyPayment === "true" || isMonthlyPayment === true;
    const isPersonalFlag = isPersonal === "true" || isPersonal === true;

    // Require payment screenshot unless monthly payment
    if (!isMonthly && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Payment screenshot is required for one-time payment orders",
      });
    }

    let createdOrders = [];
    let totalAmount = 0;

    for (const item of orders) {
      const { utilityId, quantity } = item;

      if (!utilityId || !quantity) {
        return res.status(400).json({
          success: false,
          message: "Each item must include utilityId and quantity",
        });
      }

      const utility = await Utility.findByPk(utilityId);
      if (!utility) {
        return res.status(404).json({
          success: false,
          message: `Utility with id ${utilityId} not found`,
        });
      }

      if (utility.availability !== "Available") {
        return res.status(400).json({
          success: false,
          message: `Utility '${utility.name}' is not available`,
        });
      }

      const price = parseFloat(utility.price);
      const itemTotal = price * quantity;
      totalAmount += itemTotal;

      const order = await UtilityOrder.create({
        userId,
        utilityId,
        quantity,
        price,
        totalAmount: itemTotal,
        specialInstructions: specialInstructions || null,
        utrNumber: utrNumber || null,
        paymentScreenshot: req.file
          ? `/uploads/utility-orders/${req.file.filename}`
          : null,
        status: "Pending",
        spaceId: currentSpaceId,
        isPersonal: isPersonalFlag,
        isMonthlyPayment: isMonthly,
        paid: "Pending",
      });

      createdOrders.push(order);
    }

    try {
      await sendPushToTopic("utility_admin", {
        notification: {
          title: "New Utility Order",
          body: `${createdOrders.length} item(s), total ₹${totalAmount}`,
        },
        data: { type: "utility_order", total: String(totalAmount) },
      });
    } catch (e) {
      console.error("Utility push failed:", e);
    }

    return res.status(201).json({
      success: true,
      message: "Utility orders placed successfully",
      totalAmount,
      orders: createdOrders,
    });
  } catch (error) {
    console.error("Error placing utility order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place utility order",
      error: error.message,
    });
  }
};

// Get logged-in user's utility orders
inventoryController.getUserUtilityOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await UtilityOrder.findAll({
      where: { userId },
      include: [
        {
          model: Utility,
          as: "utility",
          attributes: ["id", "name", "category", "price"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "User utility orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching user utility orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch utility orders",
      error: error.message,
    });
  }
};

// Admin: get all utility orders
inventoryController.getAllUtilityOrders = async (req, res) => {
  try {
    const orders = await UtilityOrder.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email", "mobile"],
        },
        {
          model: Utility,
          as: "utility",
          attributes: ["id", "name", "category", "price"],
        },
        {
          model: Space,
          as: "space",
          attributes: ["roomNumber", "cabinNumber", "spaceName"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "All utility orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching all utility orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch utility orders",
      error: error.message,
    });
  }
};

// Admin: update utility order status
inventoryController.updateUtilityOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid } = req.body;

    const order = await UtilityOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Utility order not found",
      });
    }

    const validStatuses = ["Pending", "Confirmed", "Delivered", "Cancelled"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const validPaid = ["Yes", "No", "Pending"];
    if (paid && !validPaid.includes(paid)) {
      return res.status(400).json({
        success: false,
        message: `Invalid paid value. Must be one of: ${validPaid.join(", ")}`,
      });
    }

    if (status) order.status = status;
    if (paid) order.paid = paid;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Utility order updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error updating utility order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update utility order",
      error: error.message,
    });
  }
};

module.exports = inventoryController;
