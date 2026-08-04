const Category = require("../../models/E-comm/productCategory");
const Product = require("../../models/E-comm/Product");
const TopBanner = require("../../models/E-comm/TopBanner")


// =========================
// Get All Active Categories
// =========================
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .select("_id name description image");

        return res.status(200).json({
            success: true,
            message: "Categories fetched successfully.",
            count: categories.length,
            data: categories,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


 exports.getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const totalProducts = await Product.countDocuments({
            isActive: true,
        });

        const products = await Product.find({
            isActive: true,
        })
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: products,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalProducts / limit),
                totalProducts,
                limit,
                hasNextPage: page < Math.ceil(totalProducts / limit),
                hasPreviousPage: page > 1,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message,
        });
    }
};



// =====================================
// Get Products By Category
// =====================================
exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const products = await Product.find({
            category: categoryId,
            isActive: true,
        })
            .populate("category", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Products fetched successfully.",
            count: products.length,
            data: products,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};



// =====================================
// Get Product By ID
// =====================================
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            isActive: true,
        }).populate("category", "name");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: product,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =====================================
// Get Featured Products
// =====================================
exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({
            isFeatured: true,
            isActive: true,
        })
            .populate("category", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            data: products,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =====================================
// Get Latest Products
// =====================================
exports.getLatestProducts = async (req, res) => {
    try {
        const products = await Product.find({
            isActive: true,
        })
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .limit(10);

        return res.status(200).json({
            success: true,
            count: products.length,
            data: products,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =====================================
// Search Products
// =====================================
exports.searchProducts = async (req, res) => {
    try {
        const { keyword } = req.query;

        const filter = {
            isActive: true,
        };

        if (keyword) {
            filter.name = {
                $regex: keyword,
                $options: "i",
            };
        }

        const products = await Product.find(filter)
            .populate("category", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            data: products,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =====================================
// Related Products
// =====================================
exports.getRelatedProducts = async (req, res) => {
    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isActive: true,
        })
            .populate("category", "name")
            .limit(8);

        return res.status(200).json({
            success: true,
            count: relatedProducts.length,
            data: relatedProducts,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};




exports.getActiveTopBanners = async (req, res) => {
  try {
    const banners = await TopBanner.find({ isActive: true })
      .select(
        "title subtitle image buttonText redirectType redirectValue displayOrder"
      )
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: banners.length,
      data: banners,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};