const Article = require('../../models/Articles/Article');
const cloudinary = require('../../config/cloudinary');

exports.createArticle = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admins only" });
        }
        const uploadToCloudinary = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: 'cosmic_insights' }, (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url); 
                }).end(fileBuffer);
            });
        };

        let thumbnailUrl = "";
        let bannerUrl = "";
        let authorPicUrl = "";

        if (req.files.thumbnail) {
            thumbnailUrl = await uploadToCloudinary(req.files.thumbnail[0].buffer);
        }
        if (req.files.bannerImage) {
            bannerUrl = await uploadToCloudinary(req.files.bannerImage[0].buffer);
        }
        if (req.files.authorProfilePic) {
            authorPicUrl = await uploadToCloudinary(req.files.authorProfilePic[0].buffer);
        }

        const articleData = {
            ...req.body,
            thumbnail: thumbnailUrl,
            bannerImage: bannerUrl,
            author: {
                name: req.body.authorName,
                designation: req.body.authorDesignation,
                profilePic: authorPicUrl
            },
            keyTakeaways: typeof req.body.keyTakeaways === 'string' ? JSON.parse(req.body.keyTakeaways) : req.body.keyTakeaways,
            ritual: typeof req.body.ritual === 'string' ? JSON.parse(req.body.ritual) : req.body.ritual,
            tags: typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags,
            
            slug: req.body.title.toLowerCase().split(' ').join('-') + '-' + Date.now(),
            createdBy: req.user.id
        };

        const newArticle = await Article.create(articleData);

        res.status(201).json({
            success: true,
            message: "Article published with Cloudinary URLs",
            data: newArticle 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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

exports.updateArticle = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const articleId = req.params.id;
        let updateData = { ...req.body };

        const uploadToCloudinary = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ folder: 'cosmic_insights' }, (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                }).end(fileBuffer);
            });
        };

        if (req.files) {
            if (req.files.thumbnail) {
                updateData.thumbnail = await uploadToCloudinary(req.files.thumbnail[0].buffer);
            }
            if (req.files.bannerImage) {
                updateData.bannerImage = await uploadToCloudinary(req.files.bannerImage[0].buffer);
            }
            if (req.files.authorProfilePic) {
                const currentArticle = await Article.findById(articleId);
                updateData.author = {
                    ...currentArticle.author,
                    name: req.body.authorName || currentArticle.author.name,
                    designation: req.body.authorDesignation || currentArticle.author.designation,
                    profilePic: await uploadToCloudinary(req.files.authorProfilePic[0].buffer)
                };
            }
        }

        if (typeof req.body.keyTakeaways === 'string') updateData.keyTakeaways = JSON.parse(req.body.keyTakeaways);
        if (typeof req.body.ritual === 'string') updateData.ritual = JSON.parse(req.body.ritual);
        if (typeof req.body.tags === 'string') updateData.tags = JSON.parse(req.body.tags);

        const updatedArticle = await Article.findByIdAndUpdate(articleId, updateData, { new: true });

        res.status(200).json({
            success: true,
            message: "Article updated successfully",
            data: updatedArticle
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
exports.getAppInsights = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 10 } = req.query;
        
        let query = { isPublished: true };

        if (category && category !== 'All Wisdom') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const skip = (page - 1) * limit;

        const articles = await Article.find(query)
            .select('title summary thumbnail category readTime author publishedDate slug') 
            .sort({ publishedDate: -1 })
            .limit(Number(limit))
            .skip(skip);

        const total = await Article.countDocuments(query);

        res.status(200).json({
            success: true,
            results: articles.length,
            totalArticles: total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            data: articles
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};




exports.getAppInsightDetail = async (req, res) => {
    try {
        const { slug } = req.params;

        const article = await Article.findOne({ slug, isPublished: true });

        if (!article) {
            return res.status(404).json({ success: false, message: "Insight not found" });
        }

        const relatedArticles = await Article.find({
            category: article.category,
            _id: { $ne: article._id },
            isPublished: true
        })
        .select('title thumbnail category readTime slug')
        .limit(3);

        res.status(200).json({
            success: true,
            data: article,
            related: relatedArticles
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};