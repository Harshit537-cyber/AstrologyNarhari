const express = require("express");
const router = express.Router();

const categoryController = require("../../controllers/User/productController");

router.get("/categories", categoryController.getAllCategories);
router.get("/categories", productController.getAllCategories);

router.get(
    "/products/category/:categoryId",
    productController.getProductsByCategory
);

router.get(
    "/product/:id",
    productController.getProductById
);

router.get(
    "/featured-products",
    productController.getFeaturedProducts
);

router.get(
    "/latest-products",
    productController.getLatestProducts
);

router.get(
    "/search-products",
    productController.searchProducts
);

router.get(
    "/related-products/:id",
    productController.getRelatedProducts
);

module.exports = router;