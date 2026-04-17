const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const authMiddleware = require("../middlewares/authAdminMiddleware");

router.get("/", inventoryController.getAllUtilities);
router.get("/:id", inventoryController.getUtilityById);
router.post("/", authMiddleware, inventoryController.addUtility);
router.put("/:id", authMiddleware, inventoryController.updateUtility);
router.delete("/:id", authMiddleware, inventoryController.deleteUtility);

module.exports = router;
