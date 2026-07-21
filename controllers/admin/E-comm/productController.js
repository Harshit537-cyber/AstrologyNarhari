const Product = require("../../../models/E-comm/Product");
const Category = require("../../../models/E-comm/productCategory");


// ==========================
// Add Product
// ==========================
exports.addProduct = async (req, res) => {
    try {
        const {
            name,
            shortDescription,
            description,
            category,
            price,
            salePrice,
            stock,
            benefits,
            howToUse,
            careInstructions,
            isFeatured,
            isActive,
        } = req.body;

        if (!name || !description || !category || !price) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing.",
            });
        }

        const categoryExists = await Category.findById(category);

        if (!categoryExists) {
            return res.status(404).json({
                success: false,
                message: "Category not found.",
            });
        }

        let images = [];

        if (req.files && req.files.length > 0) {
            images = req.files.map(file => file.path);
        }

        const product = await Product.create({
            name,
            shortDescription,
            description,
            category,
            images,
            price,
            salePrice,
            stock,
            benefits:
                typeof benefits === "string"
                    ? JSON.parse(benefits)
                    : benefits,
            howToUse,
            careInstructions,
            isFeatured,
            isActive,
        });

        res.status(201).json({
            success: true,
            message: "Product added successfully.",
            data: product,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};



// ==========================
// Get All Products
// ==========================
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate("category", "name")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: products.length,
            data: products,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};



// ==========================
// Get Product By ID
// ==========================
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate("category", "name");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        res.json({
            success: true,
            data: product,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};



// ==========================
// Update Product
// ==========================
exports.updateProduct = async (req, res) => {
    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        if (req.body.category) {
            const category = await Category.findById(req.body.category);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found.",
                });
            }
        }

        if (req.files && req.files.length > 0) {
            product.images = req.files.map(file => file.path);
        }

        product.name = req.body.name ?? product.name;
        product.shortDescription =
            req.body.shortDescription ?? product.shortDescription;
        product.description =
            req.body.description ?? product.description;
        product.category =
            req.body.category ?? product.category;
        product.price =
            req.body.price ?? product.price;
        product.salePrice =
            req.body.salePrice ?? product.salePrice;
        product.stock =
            req.body.stock ?? product.stock;
        product.howToUse =
            req.body.howToUse ?? product.howToUse;
        product.careInstructions =
            req.body.careInstructions ?? product.careInstructions;
        product.isFeatured =
            req.body.isFeatured ?? product.isFeatured;
        product.isActive =
            req.body.isActive ?? product.isActive;

        if (req.body.benefits) {
            product.benefits =
                typeof req.body.benefits === "string"
                    ? JSON.parse(req.body.benefits)
                    : req.body.benefits;
        }

        await product.save();

        res.json({
            success: true,
            message: "Product updated successfully.",
            data: product,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};



// ==========================
// Delete Product
// ==========================
exports.deleteProduct = async (req, res) => {
    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        await product.deleteOne();

        res.json({
            success: true,
            message: "Product deleted successfully.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};