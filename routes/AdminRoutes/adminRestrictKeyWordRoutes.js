const express = require("express");
const { verifyToken, isAdmin } = require("../../middleware/auth");
const { addKeyword, getKeywords, updateKeyword,getKeywordsForChat, deleteKeyword } = require("../../controllers/admin/adminKeywordController");
const router = express.Router();


router.post("/add-keyword", verifyToken, isAdmin, addKeyword);
router.get("/get-keywords", verifyToken, isAdmin, getKeywords);
router.put("/update-keyword/:id", verifyToken, isAdmin, updateKeyword);
router.delete("/delete-keyword/:id", verifyToken, isAdmin, deleteKeyword);
router.get("/keyWordsforChat",  verifyToken, getKeywordsForChat)
module.exports = router;