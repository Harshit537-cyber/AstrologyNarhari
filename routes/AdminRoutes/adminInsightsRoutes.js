const express = require("express");
const router = express.Router();

const articleController = require("../../controllers/admin/adminInsightController");

// Auth middleware
const {verifyToken, isAdmin} = require("../../middleware/auth");

// Multer middleware
const upload = require("../../middleware/upload");

// ================= ADMIN ROUTES =================

// Create Article
router.post(
  "/create",
  verifyToken,
  isAdmin,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
    { name: "authorProfilePic", maxCount: 1 },
  ]),
  articleController.createArticle
);

// Get All Articles - Admin
router.get(
  "/admin/all",
  verifyToken,
  isAdmin,
  articleController.adminGetAllArticles
);

// Get Article By ID
router.get(
  "/admin/:id",
  verifyToken,
  isAdmin,
  articleController.getArticleById
);

// Update Article
router.put(
  "/update/:id",
  verifyToken,
  isAdmin,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
    { name: "authorProfilePic", maxCount: 1 },
  ]),
  articleController.updateArticle
);

// Delete Article
router.delete(
  "/delete/:id",
  verifyToken,
  isAdmin,
  articleController.deleteArticle
);

// Get All Newsletter Subscribers
router.get(
  "/subscribers",
  verifyToken,
  isAdmin,
  articleController.getAllSubscribers
);


// ================= USER / PUBLIC ROUTES =================

// Subscribe Newsletter
router.post(
  "/subscribe",
  articleController.subscribe
);

// Get Published Articles
router.get(
  "/all",
  articleController.getAllArticles
);

// Get Article Detail By Slug
router.get(
  "/detail/:slug",
  articleController.getArticleDetail
);

// Get Featured Article
router.get(
  "/featured",
  articleController.getFeaturedArticle
);

// Get Related Articles
router.get(
  "/related",
  articleController.getRelatedArticles
);

// Get Categories
router.get(
  "/categories",
  articleController.getCategoriesList
);

module.exports = router;