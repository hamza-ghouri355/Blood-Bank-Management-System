const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

router.get("/summary/available", inventoryController.getAvailableSummary);
router.get("/summary/expiring", inventoryController.getExpiringSoon);
router.post("/check-expiry", inventoryController.runExpiryCheck);

router.get("/", inventoryController.getAllInventory);
router.get("/:id", inventoryController.getInventoryById);
router.post("/", inventoryController.createInventory);
router.put("/:id", inventoryController.updateInventory);
router.delete("/:id", inventoryController.deleteInventory);

module.exports = router;
