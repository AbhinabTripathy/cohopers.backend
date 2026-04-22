const express = require("express");
const router = express.Router();
const cafeteriaController = require("../controllers/cafeteria.controller");
const authUserMiddleware = require("../middlewares/authUserMiddleware");
const adminAuthMiddleware = require("../middlewares/authAdminMiddleware");
const upload = require("../middlewares/upload.middleware");

// Configure upload middleware for cafeteria
const cafeteriaUpload = upload("cafeteria").single("paymentScreenshot");

// ─── Cafeteria Items (Menu Management) ───────────────────────────────────────
// Public: view items
router.get("/items", cafeteriaController.getAllItems);
router.get("/items/:id", cafeteriaController.getItemById);

// Admin: manage items
router.post("/items", adminAuthMiddleware, cafeteriaController.addItem);
router.put("/items/:id", adminAuthMiddleware, cafeteriaController.updateItem);
router.delete("/items/:id", adminAuthMiddleware, cafeteriaController.deleteItem);

// ─── Cafeteria Orders ─────────────────────────────────────────────────────────
// User routes - require user authentication
router.use(authUserMiddleware);
router.post("/order", cafeteriaUpload, cafeteriaController.placeOrder);
router.get("/orders", cafeteriaController.getUserOrders);

// Admin routes - require admin authentication
router.get(
  "/admin/orders",
  adminAuthMiddleware,
  cafeteriaController.getAllOrders,
);
router.put(
  "/admin/orders/:id",
  adminAuthMiddleware,
  cafeteriaController.updateOrderStatus,
);

module.exports = router;
