const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyOtp, register, getProfile, logoutPandit, updatePanditFCMToken } = require('../../controllers/Pandit/panditAuthController');
const { verifyToken, isPandit } = require('../../middleware/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const cpUpload = upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'certificatePhotos', maxCount: 4 }
]);

router.post('/verify-otp', verifyOtp);
router.post('/register', verifyToken, isPandit, cpUpload, register);
router.get('/profile', verifyToken, isPandit, getProfile);
router.post('/logout', verifyToken, isPandit, logoutPandit);
router.patch('/update-fcm', verifyToken, isPandit, updatePanditFCMToken);

module.exports = router;