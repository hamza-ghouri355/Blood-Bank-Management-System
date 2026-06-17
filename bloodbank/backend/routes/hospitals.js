const express = require("express");
const router = express.Router();
const hospitalController = require("../controllers/hospitalController");

router.get("/", hospitalController.getAllHospitals);
router.get("/:id", hospitalController.getHospitalById);
router.post("/", hospitalController.createHospital);
router.put("/:id", hospitalController.updateHospital);
router.delete("/:id", hospitalController.deleteHospital);

module.exports = router;
