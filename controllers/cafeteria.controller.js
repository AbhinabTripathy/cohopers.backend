const { CafeteriaOrder, CafeteriaItem, User, Booking, Space, Kyc } = require("../models");
const httpStatus = require("../enums/httpStatusCode.enum");
const { Op } = require("sequelize");
const { sendPushToTopic, sendPushToUserTopic } = require("../utils/helper");

const cafeteriaController = {};

// Get menu items
cafeteriaController.getMenu = async (req, res) => {
  try {
    const menu = {
      coffee: [
        { name: "Cappuccino", price: 30 },
        { name: "Black Coffee", price: 30 },
        { name: "Espresso", price: 30 },
      ],
      tea: [
        { name: "Lemon Tea", price: 20 },
        { name: "Masala/Cardamom Tea", price: 20 },
        { name: "Green Tea", price: 20 },
      ],
    };

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Menu fetched successfully",
      data: menu,
    });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch menu",
      error: error.message,
    });
  }
};

// Place a new order
cafeteriaController.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};
    let {
      orders,
      specialInstructions,
      utrNumber,
      isPersonal,
      isMonthlyPayment,
    } = body;

    // Parse orders if it's a string
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

    // Check if orders array is provided
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Orders array is required",
      });
    }

    const validCoffeeItems = ["Cappuccino", "Black Coffee", "Espresso"];
    const validTeaItems = ["Lemon Tea", "Masala/Cardamom Tea", "Green Tea"];

    let createdOrders = [];
    let totalAmount = 0;

    const tzAdjusted = new Date(
      Date.now() - new Date().getTimezoneOffset() * 60000,
    );
    const today = tzAdjusted.toISOString().slice(0, 10);

    let currentSpaceId = body.spaceId ? Number(body.spaceId) : null;

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

    // Retrieve the KYC ID for the user
    const kycRecord = await Kyc.findOne({ where: { userId } });
    const kycId = kycRecord ? kycRecord.id : null;

    // Process each order item
    for (const item of orders) {
      const { category, itemName, quantity, price } = item;

      if (!itemName || !quantity || price === undefined) {
        return res.status(400).json({
          success: false,
          message: "Each item must include itemName, quantity, and price",
        });
      }

      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid positive number",
        });
      }

      const itemTotal = parsedPrice * quantity;
      totalAmount += itemTotal;

      // Create order record
      const order = await CafeteriaOrder.create({
        userId,
        spaceId: currentSpaceId,
        orderType: category || null,
        itemName,
        quantity,
        price: parsedPrice,
        totalAmount: itemTotal,
        specialInstructions,
        utrNumber,
        paymentScreenshot: req.file
          ? `/uploads/cafeteria/${req.file.filename}`
          : null,
        status: "Pending",
        isPersonal: isPersonal === "true" || isPersonal === true,
        isMonthlyPayment: isMonthlyPayment === "true" || isMonthlyPayment === true,
        paid: "Pending",
        kycId,
      });

      createdOrders.push(order);
    }

    try {
      // Send to cafeteria admin topic AND general cafeteria updates topic
      const pushId1 = await sendPushToTopic("cafeteria_admin", {
        notification: {
          title: "New Cafeteria Order",
          body: `${createdOrders.length} item(s), total ₹${totalAmount}`,
        },
        data: { type: "cafeteria_order", total: String(totalAmount) },
      });

      const pushId2 = await sendPushToTopic("cafeteria_updates", {
        notification: {
          title: "New Cafeteria Order",
          body: `${createdOrders.length} item(s), total ₹${totalAmount}`,
        },
        data: { type: "cafeteria_order", total: String(totalAmount) },
      });

      console.log(`✓ Push sent to cafeteria_admin: ${pushId1}`);
      console.log(`✓ Push sent to cafeteria_updates: ${pushId2}`);
    } catch (e) {
      console.error("✗ Cafeteria push failed:", e);
    }

    return res.status(201).json({
      success: true,
      message: "Orders placed successfully",
      totalAmount,
      cabinNumber: req.user.cabinNumber || null,
      roomNumber: req.user.roomNumber || null,
      orders: createdOrders,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message,
    });
  }
};

// Get user's orders
cafeteriaController.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await CafeteriaOrder.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    return res.status(httpStatus.OK).json({
      success: true,
      message: "User orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch user orders",
      error: error.message,
    });
  }
};

// for Admin Get all orders
cafeteriaController.getAllOrders = async (req, res) => {
  try {
    const orders = await CafeteriaOrder.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email", "mobile", "cabinNumber", "roomNumber", "userType"],
        },
        {
          model: Space,
          as: "space",
          attributes: ["roomNumber", "cabinNumber", "spaceName", "seater"],
        },
        {
          model: Kyc,
          as: "kyc",
          attributes: ["companyName"],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "All orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Public test function to get all orders without authentication
cafeteriaController.testGetAllOrders = async (req, res) => {
  try {
    const orders = await CafeteriaOrder.findAll({
      order: [["createdAt", "DESC"]],
    });

    return res.status(httpStatus.OK).json({
      success: true,
      message: "All orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch all orders",
      error: error.message,
    });
  }
};

// Admin: Update order status and payment status
cafeteriaController.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid } = req.body;

    // Validate status if provided
    if (
      status &&
      !["Pending", "Confirmed", "Delivered", "Cancelled"].includes(status)
    ) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Validate paid field if provided
    if (paid && !["Yes", "No"].includes(paid)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid paid value. Must be 'Yes' or 'No'",
      });
    }

    const order = await CafeteriaOrder.findByPk(id);
    if (!order) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order is already Cancelled - prevent any further updates
    if (order.status === "Cancelled") {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Cannot update this order. Order is Cancelled and locked.",
      });
    }

    // Update status if provided (explicit status takes priority)
    if (status) {
      order.status = status;
    }

    // Update paid status if provided
    // Only auto-change status if no explicit status was provided
    if (paid) {
      order.paid = paid;
      // If paid is "No", automatically cancel the order (only if status not explicitly set)
      if (paid === "No" && !status) {
        order.status = "Cancelled";
      }
      // If paid is "Yes", set to Confirmed (only if status not explicitly set)
      else if (paid === "Yes" && !status) {
        order.status = "Confirmed";
      }
    }

    await order.save();

    try {
      const finalStatus = order.status;
      const pushId = await sendPushToUserTopic(order.userId, {
        notification: {
          title: `Cafeteria Order ${finalStatus}`,
          body: `Order #${order.id} is ${finalStatus}`,
        },
        data: {
          type: "cafeteria_order",
          entity: "cafeteria_order",
          entityId: String(order.id),
          status: finalStatus,
          paid: order.paid,
        },
      });
      console.log(`Push sent to topic user_${order.userId}: ${pushId}`);
    } catch (e) {
      console.error("Cafeteria order push failed:", e);
    }

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

// ─── Cafeteria Items CRUD ────────────────────────────────────────────────────

// Add a new cafeteria item (admin only)
cafeteriaController.addItem = async (req, res, next) => {
  try {
    const { category, item, price } = req.body;

    if (!category || !item || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Category, item and price are required",
      });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    const newItem = await CafeteriaItem.create({
      category: category.trim(),
      item: item.trim(),
      price: parsedPrice,
    });

    return res.status(201).json({
      success: true,
      message: "Cafeteria item added successfully",
      data: newItem,
    });
  } catch (error) {
    console.error("Error adding cafeteria item:", error);
    next(error);
  }
};

// Get all cafeteria items
cafeteriaController.getAllItems = async (req, res, next) => {
  try {
    const items = await CafeteriaItem.findAll({ order: [["category", "ASC"], ["item", "ASC"]] });
    return res.status(200).json({
      success: true,
      message: "Cafeteria items retrieved successfully",
      data: items,
    });
  } catch (error) {
    console.error("Error fetching cafeteria items:", error);
    next(error);
  }
};

// Get a cafeteria item by id
cafeteriaController.getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await CafeteriaItem.findByPk(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cafeteria item not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Cafeteria item retrieved successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error fetching cafeteria item:", error);
    next(error);
  }
};

// Update a cafeteria item (admin only)
cafeteriaController.updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, item, price } = req.body;

    const cafeteriaItem = await CafeteriaItem.findByPk(id);
    if (!cafeteriaItem) {
      return res.status(404).json({
        success: false,
        message: "Cafeteria item not found",
      });
    }

    const updateData = {};
    if (category !== undefined) updateData.category = category.trim();
    if (item !== undefined) updateData.item = item.trim();
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

    await cafeteriaItem.update(updateData);

    return res.status(200).json({
      success: true,
      message: "Cafeteria item updated successfully",
      data: cafeteriaItem,
    });
  } catch (error) {
    console.error("Error updating cafeteria item:", error);
    next(error);
  }
};

// Delete a cafeteria item (admin only)
cafeteriaController.deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cafeteriaItem = await CafeteriaItem.findByPk(id);
    if (!cafeteriaItem) {
      return res.status(404).json({
        success: false,
        message: "Cafeteria item not found",
      });
    }
    await cafeteriaItem.destroy();
    return res.status(200).json({
      success: true,
      message: "Cafeteria item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting cafeteria item:", error);
    next(error);
  }
};

module.exports = cafeteriaController;
