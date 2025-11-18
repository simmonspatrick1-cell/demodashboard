const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Debug endpoint ready',
    timestamp: new Date().toISOString()
  });
});

router.post('/echo', (req, res) => {
  res.json({
    success: true,
    payload: req.body || null
  });
});

module.exports = router;
