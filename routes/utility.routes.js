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
const utilityUpload = upload("utility-orders").fields([
  { name: "paymentScreenshot", maxCount: 1 },
  { name: "printFile", maxCount: 1 },
]);
const conditionalUtilityUpload = (req, res, next) => {
  if (req.is("multipart/form-data")) return utilityUpload(req, res, next);
  next();
};
router.post(
  "/order/place",
  authUserMiddleware,
  conditionalUtilityUpload,
  inventoryController.placeUtilityOrder,
);
router.get("/order/my-orders", authUserMiddleware, inventoryController.getUserUtilityOrders);

// Admin: manage utility orders
router.get("/admin/orders", authAdminMiddleware, inventoryController.getAllUtilityOrders);
router.put("/admin/orders/:id", authAdminMiddleware, inventoryController.updateUtilityOrderStatus);

module.exports = router;
