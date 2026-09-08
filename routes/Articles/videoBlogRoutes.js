const express = require('express');
const router = express.Router();

const { 
    addVideo, 
    updateVideo, 
    deleteVideo, 
    getAdminVideos, 
    getUserVideos 
} = require('../../controllers/videoBlog/videoBlogController');

const {verifyToken, isAdmin } = require('../../middleware/auth');

router.get('/user/all', getUserVideos);

router.post('/admin/add', addVideo);

router.put('/admin/update/:id', verifyToken, isAdmin, updateVideo);


router.delete('/admin/delete/:id', verifyToken, isAdmin, deleteVideo);

router.get('/admin/all', verifyToken, isAdmin, getAdminVideos);

module.exports = router;