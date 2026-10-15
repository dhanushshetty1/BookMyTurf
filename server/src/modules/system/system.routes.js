import express from 'express';

const router = express.Router();

router.get('/time', (req, res) => {
  res.json({
    serverTime: new Date().toISOString(),
    timezone: 'UTC'
  });
});

export default router;
