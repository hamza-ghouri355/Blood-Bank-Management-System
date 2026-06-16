// routes/donations.js
const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

router.get('/recent', donationController.getRecentDonations);
router.get('/', donationController.getAllDonations);
router.get('/:id', donationController.getDonationById);
router.post('/', donationController.createDonation);
router.delete('/:id', donationController.deleteDonation);

module.exports = router;
