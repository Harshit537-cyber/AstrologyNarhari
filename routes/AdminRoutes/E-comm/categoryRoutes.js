const express = require("express");
const router = express.Router();

const {
    addCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} = require("../../../controllers/admin/E-comm/productCategoryController");

const upload = require("../../../middleware/upload");
const { verifyToken, isAdmin } = require("../../../middleware/auth");

router.post("/",verifyToken, isAdmin, upload.single("image"), addCategory);
router.get("/",verifyToken, isAdmin, getAllCategories);
router.get("/:id",verifyToken, isAdmin, getCategoryById);
router.put("/:id",verifyToken, isAdmin, upload.single("image"), updateCategory);
router.delete("/:id",verifyToken, isAdmin, deleteCategory);

module.exports = router;