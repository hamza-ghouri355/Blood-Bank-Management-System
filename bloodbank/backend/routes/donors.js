const express = require("express");
const router = express.Router();
const donorController = require("../controllers/donorController");

router.get("/", donorController.getAllDonors);
router.get("/:id", donorController.getDonorById);
router.post("/", donorController.createDonor);
router.put("/:id", donorController.updateDonor);
router.delete("/:id", donorController.deleteDonor);
router.post(
  "/:id/recalculate-eligibility",
  donorController.recalculateEligibility,
);

module.exports = router;
