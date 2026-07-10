const express = require('express');
const router = express.Router();
const { register, login } = require('../../controllers/User/userAuth');

router.post('/register', register);
router.post('/login', login);

module.exports = router;