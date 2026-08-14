const express = require("express");
const router = express.Router();

const {
    renderBlogPage
} = require("../../controllers/admin/blogController");

router.get("/blog/:slug", renderBlogPage);

module.exports = router;