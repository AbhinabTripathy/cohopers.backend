const { CafeteriaOrder, User } = require('../models');
const httpStatus = require('../enums/httpStatusCode.enum');

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
    let { orders, specialInstructions, utrNumber } = req.body;

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
        status: "Pending"
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
          required: false, // prevents Sequelize from failing if user doesn't exist
          attributes: ["id", "username", "email", "mobile"],
        },
      ],
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