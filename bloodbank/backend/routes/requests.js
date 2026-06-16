// routes/requests.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

router.get('/pending', requestController.getPendingRequests);
router.get('/', requestController.getAllRequests);
router.get('/:id', requestController.getRequestById);
router.post('/', requestController.createRequest);
router.put('/:id/reject', requestController.rejectRequest);
router.post('/:id/fulfill', requestController.fulfillRequest);

module.exports = router;
