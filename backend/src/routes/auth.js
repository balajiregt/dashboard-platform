const express = require('express');
const router = express.Router();

// Simple health check for auth
router.get('/health', (req, res) => {
    res.json({ status: 'Auth service is running' });
});

module.exports = router;
