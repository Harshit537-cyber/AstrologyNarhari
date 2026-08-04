const express = require("express");
const router = express.Router();

const productController = require("../../controllers/User/productController");


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

router.get("/shop-banners", productController.getActiveTopBanners);


router.get("/all", productController.getProducts);

module.exports = router;