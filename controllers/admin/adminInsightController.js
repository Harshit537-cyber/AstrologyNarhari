const Article = require('../../models/Articles/Article');
const cloudinary = require('../../config/cloudinary');
const Newsletter = require('../../models/Articles/NewsLetter');
const fs = require('fs'); 

const uploadToCloudinary = async (filePath) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'cosmic_insights'
        });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return result.secure_url;
    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
        throw error;
    }
};


// exports.createArticle = async (req, res) => {
//     try {
//         if (req.user.role !== 'admin') {
//             return res.status(403).json({ success: false, message: "Admins only" });
//         }

//         // Parallel Upload using Path
//         const uploadPromises = [
//             req.files?.thumbnail ? uploadToCloudinary(req.files.thumbnail[0].path) : Promise.resolve(""),
//             req.files?.bannerImage ? uploadToCloudinary(req.files.bannerImage[0].path) : Promise.resolve(""),
//             req.files?.authorProfilePic ? uploadToCloudinary(req.files.authorProfilePic[0].path) : Promise.resolve("")
//         ];

//         const [thumbnailUrl, bannerUrl, authorPicUrl] = await Promise.all(uploadPromises);

//         const parseSafely = (data) => {
//             try { return typeof data === 'string' ? JSON.parse(data) : data; } 
//             catch (e) { return []; }
//         };

//         const articleData = {
//             ...req.body,
//             thumbnail: thumbnailUrl,
//             bannerImage: bannerUrl,
//             author: {
//                 name: req.body.authorName,
//                 designation: req.body.authorDesignation,
//                 profilePic: authorPicUrl
//             },
//             quote: {
//                 text: req.body.quoteText || "",
//                 author: req.body.quoteAuthor || ""
//             },
//             keyTakeaways: parseSafely(req.body.keyTakeaways),
//             ritual: parseSafely(req.body.ritual),
//             tags: parseSafely(req.body.tags),
//             slug: req.body.title.toLowerCase().split(' ').join('-') + '-' + Date.now(),
//             createdBy: req.user.id
//         };

//         const newArticle = await Article.create(articleData);
//         res.status(201).json({ success: true, message: "Article published successfully", data: newArticle });

//     } catch (error) {
//         console.error("Create Error:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };



exports.createArticle = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Admins only"
            });
        }

        const uploadPromises = [
            req.files?.thumbnail
                ? uploadToCloudinary(req.files.thumbnail[0].path)
                : Promise.resolve(""),

            req.files?.bannerImage
                ? uploadToCloudinary(req.files.bannerImage[0].path)
                : Promise.resolve(""),

            req.files?.authorProfilePic
                ? uploadToCloudinary(req.files.authorProfilePic[0].path)
                : Promise.resolve("")
        ];

        const [thumbnailUrl, bannerUrl, authorPicUrl] =
            await Promise.all(uploadPromises);

        const parseSafely = (data) => {
            try {
                return typeof data === 'string' ? JSON.parse(data) : data;
            } catch (e) {
                return [];
            }
        };

        const articleData = {
            ...req.body,

            thumbnail: thumbnailUrl,
            bannerImage: bannerUrl,

            author: {
                name: req.body.authorName,
                designation: req.body.authorDesignation,
                profilePic: authorPicUrl
            },

            quote: {
                text: req.body.quoteText || "",
                author: req.body.quoteAuthor || ""
            },

            keyTakeaways: parseSafely(req.body.keyTakeaways),
            ritual: parseSafely(req.body.ritual),
            tags: parseSafely(req.body.tags),

            // Slug will come directly from request body
            slug: req.body.slug,

            createdBy: req.user.id
        };

        const newArticle = await Article.create(articleData);

        res.status(201).json({
            success: true,
            message: "Article published successfully",
            data: newArticle
        });

    } catch (error) {
        console.error("Create Error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



exports.adminGetAllArticles = async (req, res) => {
    try {
     if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Access Denied" });
        }

        const { page = 1, limit = 10, search, category } = req.query;
        let query = {};

        if (search) query.title = { $regex: search, $options: 'i' };
        if (category && category !== 'All Wisdom') query.category = category;

        const articles = await Article.find(query)
            .populate('createdBy', 'fullName email mobile role') 
            .sort({ createdAt: -1 }) 
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Article.countDocuments(query);

        res.status(200).json({
            success: true,
            totalCount: total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            data: articles
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



exports.getArticleById = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id).populate('createdBy', 'fullName role');
        if (!article) return res.status(404).json({ success: false, message: "Article not found" });

        res.status(200).json({ success: true, data: article });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// exports.updateArticle = async (req, res) => {
//     try {
//         if (req.user.role !== 'admin') {
//             return res.status(403).json({ success: false, message: "Unauthorized: Admins only" });
//         }

//         const articleId = req.params.id;
//         const currentArticle = await Article.findById(articleId);
//         if (!currentArticle) return res.status(404).json({ success: false, message: "Article not found" });

//         const uploadPromises = [
//             req.files?.thumbnail ? uploadToCloudinary(req.files.thumbnail[0].path) : Promise.resolve(null),
//             req.files?.bannerImage ? uploadToCloudinary(req.files.bannerImage[0].path) : Promise.resolve(null),
//             req.files?.authorProfilePic ? uploadToCloudinary(req.files.authorProfilePic[0].path) : Promise.resolve(null)
//         ];

//         const [newThumbnail, newBanner, newAuthorPic] = await Promise.all(uploadPromises);

//         let updateData = { ...req.body };
//         if (newThumbnail) updateData.thumbnail = newThumbnail;
//         if (newBanner) updateData.bannerImage = newBanner;

//         updateData.author = {
//             name: req.body.authorName || currentArticle.author.name,
//             designation: req.body.authorDesignation || currentArticle.author.designation,
//             profilePic: newAuthorPic || currentArticle.author.profilePic
//         };

//         const parseSafely = (data, fallback) => {
//             try { return typeof data === 'string' ? JSON.parse(data) : data; } 
//             catch (e) { return fallback; }
//         };

//         if (req.body.keyTakeaways) updateData.keyTakeaways = parseSafely(req.body.keyTakeaways, currentArticle.keyTakeaways);
//         if (req.body.ritual) updateData.ritual = parseSafely(req.body.ritual, currentArticle.ritual);
//         if (req.body.tags) updateData.tags = parseSafely(req.body.tags, currentArticle.tags);

//         if (req.body.title && req.body.title !== currentArticle.title) {
//             updateData.slug = req.body.title.toLowerCase().split(' ').join('-') + '-' + Date.now();
//         }

//         const updatedArticle = await Article.findByIdAndUpdate(articleId, { $set: updateData }, { new: true });
//         res.status(200).json({ success: true, message: "Article updated successfully", data: updatedArticle });

//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };




exports.updateArticle = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Admins only"
            });
        }

        const articleId = req.params.id;

        const currentArticle = await Article.findById(articleId);

        if (!currentArticle) {
            return res.status(404).json({
                success: false,
                message: "Article not found"
            });
        }

        const uploadPromises = [
            req.files?.thumbnail
                ? uploadToCloudinary(req.files.thumbnail[0].path)
                : Promise.resolve(null),

            req.files?.bannerImage
                ? uploadToCloudinary(req.files.bannerImage[0].path)
                : Promise.resolve(null),

            req.files?.authorProfilePic
                ? uploadToCloudinary(req.files.authorProfilePic[0].path)
                : Promise.resolve(null)
        ];

        const [newThumbnail, newBanner, newAuthorPic] =
            await Promise.all(uploadPromises);

        let updateData = { ...req.body };

        if (newThumbnail) {
            updateData.thumbnail = newThumbnail;
        }

        if (newBanner) {
            updateData.bannerImage = newBanner;
        }

        updateData.author = {
            name: req.body.authorName || currentArticle.author.name,
            designation:
                req.body.authorDesignation || currentArticle.author.designation,
            profilePic:
                newAuthorPic || currentArticle.author.profilePic
        };

        const parseSafely = (data, fallback) => {
            try {
                return typeof data === 'string'
                    ? JSON.parse(data)
                    : data;
            } catch (e) {
                return fallback;
            }
        };

        if (req.body.keyTakeaways) {
            updateData.keyTakeaways = parseSafely(
                req.body.keyTakeaways,
                currentArticle.keyTakeaways
            );
        }

        if (req.body.ritual) {
            updateData.ritual = parseSafely(
                req.body.ritual,
                currentArticle.ritual
            );
        }

        if (req.body.tags) {
            updateData.tags = parseSafely(
                req.body.tags,
                currentArticle.tags
            );
        }

        // Slug will only be updated if provided in request body
        if (req.body.slug) {
            updateData.slug = req.body.slug;
        }

        const updatedArticle = await Article.findByIdAndUpdate(
            articleId,
            { $set: updateData },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Article updated successfully",
            data: updatedArticle
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


exports.deleteArticle = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) return res.status(404).json({ success: false, message: "Article not found" });

        res.status(200).json({ success: true, message: "Article deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// User side 
exports.subscribe = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const existing = await Newsletter.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: "You are already subscribed!" });
        }

        await Newsletter.create({ email });

        res.status(201).json({
            success: true,
            message: "Success! You'll now receive cosmic updates."
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.getAllSubscribers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const subscribers = await Newsletter.find().sort('-createdAt');
        res.status(200).json({ success: true, count: subscribers.length, data: subscribers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getAllArticles = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 6, sort = '-publishedDate' } = req.query;

        let query = { isPublished: true };
        
        if (category && category !== 'All Wisdom') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const articles = await Article.find(query)
            .select('title subtitle thumbnail category author readTime publishedDate slug isFeatured')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(); 
        const totalArticles = await Article.countDocuments(query);
        const totalPages = Math.ceil(totalArticles / limit);

        res.status(200).json({
            success: true,
            meta: {
                totalArticles,
                totalPages,
                currentPage: parseInt(page),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            data: articles
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};


exports.getArticleDetail = async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug, isPublished: true }).lean();

        if (!article) {
            return res.status(404).json({ success: false, message: "Article not found" });
        }

        res.status(200).json({ success: true, data: article });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.getFeaturedArticle = async (req, res) => {
    try {
        const featured = await Article.findOne({ isFeatured: true, isPublished: true })
            .sort('-createdAt')
            .lean();
        
        res.status(200).json({ success: true, data: featured });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRelatedArticles = async (req, res) => {
    try {
        const { category, currentId } = req.query;
        
        const related = await Article.find({
            category: category,
            isPublished: true,
            _id: { $ne: currentId }
        })
        .select('title thumbnail category author readTime slug')
        .limit(3)
        .sort('-publishedDate')
        .lean();

        res.status(200).json({ success: true, data: related });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getCategoriesList = async (req, res) => {
    try {
        const categories = await Article.aggregate([
            { $match: { isPublished: true } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};