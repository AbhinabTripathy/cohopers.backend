const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const authAdminMiddleware = require("../middlewares/authAdminMiddleware");
const authUserMiddleware = require("../middlewares/authUserMiddleware");
const upload = require("../middlewares/upload.middleware");

// Public: view utilities
router.get("/", inventoryController.getAllUtilities);
router.get("/:id", inventoryController.getUtilityById);

// Admin: manage utilities
router.post("/", authAdminMiddleware, inventoryController.addUtility);
router.put("/:id", authAdminMiddleware, inventoryController.updateUtility);
router.delete("/:id", authAdminMiddleware, inventoryController.deleteUtility);

// User/Visitor: place and view utility orders
router.post(
  "/order/place",
  authUserMiddleware,
  upload("utility-orders").single("paymentScreenshot"),
  inventoryController.placeUtilityOrder,
);
router.get("/order/my-orders", authUserMiddleware, inventoryController.getUserUtilityOrders);

// Admin: manage utility orders
router.get("/admin/orders", authAdminMiddleware, inventoryController.getAllUtilityOrders);
router.put("/admin/orders/:id", authAdminMiddleware, inventoryController.updateUtilityOrderStatus);

module.exports = router;
