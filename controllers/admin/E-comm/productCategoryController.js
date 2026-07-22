const Category = require("../../../models/E-comm/productCategory");
const  cloudinary  = require("../../../config/cloudinary");

exports.addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        const categoryExists = await Category.findOne({
            name: { $regex: `^${name}$`, $options: "i" },
        });

        if (categoryExists) {
            return res.status(400).json({
                success: false,
                message: "Category already exists",
            });
        }

        let image = "";

        if (req.file) {
            const uploadedImage = await cloudinary.uploader.upload(
                req.file.path,
                {
                    folder: "categories",
                }
            );

            image = uploadedImage.secure_url;
        }

        const category = await Category.create({
            name,
            description,
            image,
        });

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


exports.updateCategory = async (req, res) => {
    try {
        const { name, description, isActive } = req.body;

        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        if (name) {
            const exists = await Category.findOne({
                _id: { $ne: req.params.id },
                name: { $regex: `^${name}$`, $options: "i" },
            });

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Category name already exists",
                });
            }

            category.name = name;
        }

        if (description !== undefined)
            category.description = description;

        if (isActive !== undefined)
            category.isActive = isActive;

        if (req.file) {
            const uploadedImage = await cloudinary.uploader.upload(
                req.file.path,
                {
                    folder: "categories",
                }
            );

            category.image = uploadedImage.secure_url;
        }

        await category.save();

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};




exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }

        await category.deleteOne();

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};






exports.getAllCategories = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            isActive,
        } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        const total = await Category.countDocuments(filter);

        const categories = await Category.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        return res.status(200).json({
            success: true,
            message: "Categories fetched successfully",
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            data: categories,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};