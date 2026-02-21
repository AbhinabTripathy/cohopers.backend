const { CafeteriaOrder, User, Booking, Space } = require('../models');
const httpStatus = require('../enums/httpStatusCode.enum');
const { Op } = require('sequelize');

const cafeteriaController = {};

// Get menu items
cafeteriaController.getMenu = async (req, res) => {
  try {
    const menu = {
      coffee: [
        { name: "Cappuccino", price: 30 },
        { name: "Black Coffee", price: 30 },
        { name: "Espresso", price: 30 }
      ],
      tea: [
        { name: "Lemon Tea", price: 20 },
        { name: "Masala/Cardamom Tea", price: 20 },
        { name: "Green Tea", price: 20 }
      ]
    };

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Menu fetched successfully",
      data: menu
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch menu',
      error: error.message
    });
  }
};

// Place a new order
cafeteriaController.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    let { orders, specialInstructions, utrNumber, isPersonal } = req.body;

    // Parse orders if it's a string 
    if (typeof orders === "string") {
      try {
        orders = JSON.parse(orders);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON format for orders"
        });
      }
    }

    // Check if orders array is provided
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Orders array is required"
      });
    }

    const validCoffeeItems = ["Cappuccino", "Black Coffee", "Espresso"];
    const validTeaItems = ["Lemon Tea", "Masala/Cardamom Tea", "Green Tea"];

    let createdOrders = [];
    let totalAmount = 0;

    const tzAdjusted = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000));
    const today = tzAdjusted.toISOString().slice(0, 10);

    let currentSpaceId = req.body.spaceId ? Number(req.body.spaceId) : null;

    if (!currentSpaceId) {
      const activeBooking = await Booking.findOne({
        where: {
          userId,
          status: "Confirm",
          startDate: { [Op.lte]: today },
          endDate: { [Op.gte]: today }
        },
        order: [["startDate", "DESC"]]
      });

      if (activeBooking) {
        currentSpaceId = activeBooking.spaceId;
      } else {
        const latestBooking = await Booking.findOne({
          where: { userId, status: "Confirm" },
          order: [["endDate", "DESC"]]
        });
        currentSpaceId = latestBooking ? latestBooking.spaceId : null;
      }
    }

    // Process each order item
    for (const item of orders) {
      const { orderType, itemName, quantity } = item;

      // Validate fields
      if (!orderType || !itemName || !quantity) {
        return res.status(400).json({
          success: false,
          message: "Each item must include orderType, itemName, and quantity"
        });
      }

      // Validate order type
      if (!["Coffee", "Tea"].includes(orderType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid order type '${orderType}'. Must be 'Coffee' or 'Tea'`
        });
      }

      // Determine price
      let price = 0;
      if (orderType === "Coffee") {
        if (validCoffeeItems.includes(itemName)) price = 30;
        else {
          return res.status(400).json({
            success: false,
            message: `Invalid coffee item name '${itemName}'`
          });
        }
      } else if (orderType === "Tea") {
        if (validTeaItems.includes(itemName)) price = 20;
        else {
          return res.status(400).json({
            success: false,
            message: `Invalid tea item name '${itemName}'`
          });
        }
      }

      const itemTotal = price * quantity;
      totalAmount += itemTotal;

      // Create order record
      const order = await CafeteriaOrder.create({
        userId,
        spaceId: currentSpaceId,
        orderType,
        itemName,
        quantity,
        price,
        totalAmount: itemTotal,
        specialInstructions,
        utrNumber,
        paymentScreenshot: req.file
          ? `/uploads/cafeteria/${req.file.filename}`
          : null,
        status: "Pending",
        isPersonal: isPersonal === true // Treat as personal if explicitly true
      });

      createdOrders.push(order);
    }

    return res.status(201).json({
      success: true,
      message: "Orders placed successfully",
      totalAmount,
      orders: createdOrders
    });
  } catch (error) {
    console.error("Error placing order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message
    });
  }
};

// Get user's orders
cafeteriaController.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await CafeteriaOrder.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    return res.status(httpStatus.OK).json({
      success: true,
      message: "User orders fetched successfully",
      data: orders
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch user orders',
      error: error.message
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
          required: false,
          attributes: ["id", "username", "email", "mobile"],
        },
        {
          model: Space,
          as: "space",
          attributes: ["id","space_name","roomNumber","cabinNumber","seater"]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    const enhanced = orders.map(o => {
      const obj = o.toJSON();
      const s = obj.space;
      obj.orderFrom = s ? {
        roomNumber: s.roomNumber,
        cabinNumber: s.cabinNumber,
        spaceName: s.space_name,
        seater: s.seater,
       
      } : null;
      delete obj.space;
      return obj;
    });

    return res.status(httpStatus.OK).json({
      success: true,
      message: "All orders fetched successfully",
      data: enhanced,
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

// Public test function to get all orders without authentication
cafeteriaController.testGetAllOrders = async (req, res) => {
  try {
    const orders = await CafeteriaOrder.findAll({
      order: [['createdAt', 'DESC']]
    });

    return res.status(httpStatus.OK).json({
      success: true,
      message: "All orders fetched successfully",
      data: orders
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch all orders',
      error: error.message
    });
  }
};

// Admin: Update order status
cafeteriaController.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Pending', 'Confirmed', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid status value"
      });
    }

    const order = await CafeteriaOrder.findByPk(id);
    if (!order) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Order not found"
      });
    }

    order.status = status;
    await order.save();

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Order status updated successfully",
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

module.exports = cafeteriaController;