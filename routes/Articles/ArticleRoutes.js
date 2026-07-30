const express = require('express');
const router = express.Router();

const { 
    createArticle, 
    updateArticle, 
    getAllSubscribers,
    getAllArticles, 
    getArticleDetail, 
    getFeaturedArticle, 
    getRelatedArticles,
    getCategoriesList,
    subscribe 
} = require('../../controllers/admin/adminInsightController'); 

const { verifyToken , isAdmin,isUser} = require('../../middleware/auth'); 

const upload = require('../../middleware/upload'); 

router.get('/list', verifyToken,isUser,getAllArticles);

router.get('/featured', verifyToken,isUser,getFeaturedArticle);

router.get('/categories',  verifyToken,isUser,getCategoriesList);

router.get('/detail/:slug', verifyToken,isUser, getArticleDetail);

router.get('/related',  verifyToken,isUser,getRelatedArticles);

router.post('/subscribe',verifyToken,isUser, subscribe);

router.post(
    '/admin/create', 
    verifyToken, 
    isAdmin, 
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'bannerImage', maxCount: 1 },
        { name: 'authorProfilePic', maxCount: 1 }
    ]), 
    createArticle
);

router.put(
    '/admin/update/:id', 
    verifyToken, 
    isAdmin, 
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'bannerImage', maxCount: 1 },
        { name: 'authorProfilePic', maxCount: 1 }
    ]), 
    updateArticle
);

router.get('/admin/subscribers', verifyToken,isAdmin, getAllSubscribers);

module.exports = router;