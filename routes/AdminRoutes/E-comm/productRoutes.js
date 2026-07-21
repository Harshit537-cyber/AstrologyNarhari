const express = require("express");
const router = express.Router();

const productController = require("../../../controllers/admin/E-comm/productController");

const upload = require("../../../middleware/upload"); // multer/cloudinary middleware

router.post(
    "/add",
    upload.array("images", 10),
    productController.addProduct
);

router.get(
    "/list",
    productController.getProducts
);

router.get(
    "/:id",
    productController.getProductById
);

router.put(
    "/update/:id",
    upload.array("images", 10),
    productController.updateProduct
);

router.delete(
    "/delete/:id",
    productController.deleteProduct
);

module.exports = router;