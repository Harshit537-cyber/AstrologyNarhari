const express = require("express");
const router = express.Router();

const productController = require("../../../controllers/admin/E-comm/productController");

const upload = require("../../../middleware/upload"); // multer/cloudinary middleware
const {verifyToken , isAdmin}= require("../../../middleware/auth")
router.post(
    "/add",
    verifyToken,
    isAdmin,
    upload.array("images", 10),
    productController.addProduct
);

router.get(
    "/list",
   
    productController.getProducts
);

router.get(
    "/:id",
     verifyToken,
    productController.getProductById
);

router.put(
    "/update/:id",
     verifyToken,
    isAdmin,
    upload.array("images", 10),
    productController.updateProduct
);

router.delete(
    "/delete/:id",
     verifyToken,
    isAdmin,
    productController.deleteProduct
);

module.exports = router;