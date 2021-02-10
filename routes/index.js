const express = require('express');
const router = express.Router();
const { pickRandomAny, pickRandomMedium } = require('../services/words');

router.get('/', (req, res) => {
  res.send({ response: 'I am alive' }).status(200);
});

router.get('/generate', (req, res) => {
  res.send(pickRandomAny()).status(200);
});

router.get('/generate/medium', (req, res) => {
  res.send(pickRandomMedium()).status(200);
});

module.exports = router;
