const Article = require("../../models/Articles/Article");
const cloudinary = require("../../config/cloudinary");
const Newsletter = require("../../models/Articles/NewsLetter");
const fs = require("fs");

const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "cosmic_insights",
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
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admins only",
      });
    }

    const BACKEND_URL = "https://astrologynarhari-1.onrender.com"

    const uploadPromises = [
      req.files?.thumbnail
        ? uploadToCloudinary(req.files.thumbnail[0].path)
        : Promise.resolve(""),

      req.files?.bannerImage
        ? uploadToCloudinary(req.files.bannerImage[0].path)
        : Promise.resolve(""),

      req.files?.authorProfilePic
        ? uploadToCloudinary(req.files.authorProfilePic[0].path)
        : Promise.resolve(""),
    ];

    const [thumbnailUrl, bannerUrl, authorPicUrl] =
      await Promise.all(uploadPromises);

    const parseSafely = (data) => {
      try {
        return typeof data === "string" ? JSON.parse(data) : data;
      } catch (e) {
        return [];
      }
    };

    const slug = req.body.slug;

    const blogLink = `${BACKEND_URL}/blog/${slug}`;

    const articleData = {
      ...req.body,

      thumbnail: thumbnailUrl,
      bannerImage: bannerUrl,

      author: {
        name: req.body.authorName,
        designation: req.body.authorDesignation,
        profilePic: authorPicUrl,
      },

      quote: {
        text: req.body.quoteText || "",
        author: req.body.quoteAuthor || "",
      },

      keyTakeaways: parseSafely(req.body.keyTakeaways),
      ritual: parseSafely(req.body.ritual),
      tags: parseSafely(req.body.tags),

      // Slug comes directly from request body
      slug: slug,

      // Blog link generated using slug
      blogLink: blogLink,

      createdBy: req.user.id,
    };

    const newArticle = await Article.create(articleData);

    res.status(201).json({
      success: true,
      message: "Article published successfully",
      data: newArticle,
    });
  } catch (error) {
    console.error("Create Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.adminGetAllArticles = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access Denied" });
    }

    const { page = 1, limit = 10, search, category } = req.query;
    let query = {};

    if (search) query.title = { $regex: search, $options: "i" };
    if (category && category !== "All Wisdom") query.category = category;

    const articles = await Article.find(query)
      .populate("createdBy", "fullName email mobile role")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Article.countDocuments(query);

    res.status(200).json({
      success: true,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: articles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).populate(
      "createdBy",
      "fullName role",
    );
    if (!article)
      return res
        .status(404)
        .json({ success: false, message: "Article not found" });

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
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Admins only",
      });
    }

    const articleId = req.params.id;

    const BACKEND_URL = "https://astrologynarhari-1.onrender.com"

    const currentArticle = await Article.findById(articleId);

    if (!currentArticle) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
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
        : Promise.resolve(null),
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
      profilePic: newAuthorPic || currentArticle.author.profilePic,
    };

    const parseSafely = (data, fallback) => {
      try {
        return typeof data === "string" ? JSON.parse(data) : data;
      } catch (e) {
        return fallback;
      }
    };

    if (req.body.keyTakeaways) {
      updateData.keyTakeaways = parseSafely(
        req.body.keyTakeaways,
        currentArticle.keyTakeaways,
      );
    }

    if (req.body.ritual) {
      updateData.ritual = parseSafely(req.body.ritual, currentArticle.ritual);
    }

    if (req.body.tags) {
      updateData.tags = parseSafely(req.body.tags, currentArticle.tags);
    }

    // Update slug and blog link only when slug is provided
    if (req.body.slug) {
      updateData.slug = req.body.slug;

      updateData.blogLink = `${BACKEND_URL}/blog/${req.body.slug}`;
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      { $set: updateData },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Article updated successfully",
      data: updatedArticle,
    });
  } catch (error) {
    console.error("Update Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article)
      return res
        .status(404)
        .json({ success: false, message: "Article not found" });

    res
      .status(200)
      .json({ success: true, message: "Article deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// User side
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "You are already subscribed!" });
    }

    await Newsletter.create({ email });

    res.status(201).json({
      success: true,
      message: "Success! You'll now receive cosmic updates.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

exports.getAllSubscribers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const subscribers = await Newsletter.find().sort("-createdAt");
    res
      .status(200)
      .json({ success: true, count: subscribers.length, data: subscribers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllArticles = async (req, res) => {
  try {
    const {
      category,
      search,
      page = 1,
      limit = 6,
      sort = "-publishedDate",
    } = req.query;

    let query = { isPublished: true };

    if (category && category !== "All Wisdom") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { summary: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const articles = await Article.find(query)
      .select(
        "title subtitle thumbnail category author readTime publishedDate slug isFeatured",
      )
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
        hasPrevPage: page > 1,
      },
      data: articles,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
  }
};

exports.getArticleDetail = async (req, res) => {
  try {
    const article = await Article.findOne({
      slug: req.params.slug,
      isPublished: true,
    }).lean();

    if (!article) {
      return res
        .status(404)
        .json({ success: false, message: "Article not found" });
    }

    res.status(200).json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getFeaturedArticle = async (req, res) => {
  try {
    const featured = await Article.findOne({
      isFeatured: true,
      isPublished: true,
    })
      .sort("-createdAt")
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
      _id: { $ne: currentId },
    })
      .select("title thumbnail category author readTime slug")
      .limit(3)
      .sort("-publishedDate")
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
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.renderBlogPage = async (req, res) => {
    try {
        const { slug } = req.params;

        const article = await Article.findOne({
            slug,
            isPublished: true
        }).lean();

        if (!article) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Blog Not Found</title>
                    <meta charset="UTF-8">
                </head>

                <body style="
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    background: #0d0d0d;
                    color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                ">
                    <div style="text-align:center;">
                        <h1>Blog Not Found</h1>
                        <p>The article you are looking for does not exist.</p>
                    </div>
                </body>
                </html>
            `);
        }

        const html = `
        <!DOCTYPE html>
        <html lang="en">

        <head>
            <meta charset="UTF-8" />

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            />

            <title>${article.title}</title>

            <meta
                name="description"
                content="${article.summary || ""}"
            />

            <meta
                property="og:title"
                content="${article.title}"
            />

            <meta
                property="og:description"
                content="${article.summary || ""}"
            />

            <meta
                property="og:image"
                content="${article.bannerImage || article.thumbnail}"
            />

            <meta
                property="og:type"
                content="article"
            />

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    font-family: Arial, Helvetica, sans-serif;
                    background: #0b0b0b;
                    color: #f5f5f5;
                    line-height: 1.7;
                }

                .blog-container {
                    max-width: 1000px;
                    margin: auto;
                    padding: 40px 20px 80px;
                }

                .blog-category {
                    display: inline-block;
                    padding: 6px 14px;
                    border-radius: 20px;
                    background: rgba(212, 175, 55, 0.12);
                    color: #d4af37;
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 20px;
                }

                h1 {
                    font-size: 48px;
                    line-height: 1.2;
                    margin: 0 0 15px;
                }

                .subtitle {
                    font-size: 20px;
                    color: #aaa;
                    margin-bottom: 25px;
                }

                .meta {
                    display: flex;
                    gap: 20px;
                    flex-wrap: wrap;
                    color: #aaa;
                    font-size: 14px;
                    margin-bottom: 30px;
                }

                .banner {
                    width: 100%;
                    max-height: 520px;
                    object-fit: cover;
                    border-radius: 18px;
                    margin-bottom: 35px;
                }

                .summary {
                    padding: 25px;
                    border-left: 4px solid #d4af37;
                    background: #151515;
                    border-radius: 8px;
                    margin-bottom: 35px;
                }

                .summary h2 {
                    color: #d4af37;
                    margin-top: 0;
                }

                .content {
                    font-size: 17px;
                    color: #ddd;
                    white-space: pre-line;
                }

                .author {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 20px;
                    background: #151515;
                    border-radius: 12px;
                    margin: 35px 0;
                }

                .author img {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .author-name {
                    font-weight: 700;
                    color: #fff;
                }

                .author-designation {
                    color: #999;
                    font-size: 14px;
                }

                .section {
                    margin-top: 45px;
                }

                .section h2 {
                    color: #d4af37;
                    margin-bottom: 20px;
                }

                .takeaway {
                    display: flex;
                    gap: 15px;
                    padding: 15px;
                    background: #151515;
                    border-radius: 10px;
                    margin-bottom: 12px;
                }

                .takeaway-number {
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: #d4af37;
                    color: #000;
                    font-weight: bold;
                    flex-shrink: 0;
                }

                .quote {
                    margin: 40px 0;
                    padding: 30px;
                    background: #151515;
                    border-radius: 15px;
                    border-left: 4px solid #d4af37;
                    font-size: 20px;
                    font-style: italic;
                }

                .quote-author {
                    display: block;
                    margin-top: 10px;
                    color: #d4af37;
                    font-size: 14px;
                    font-style: normal;
                }

                .tags {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .tag {
                    padding: 6px 12px;
                    border-radius: 20px;
                    background: #1c1c1c;
                    color: #d4af37;
                    font-size: 13px;
                }

                @media (max-width: 768px) {

                    h1 {
                        font-size: 34px;
                    }

                    .subtitle {
                        font-size: 17px;
                    }

                    .blog-container {
                        padding: 25px 15px 50px;
                    }

                    .content {
                        font-size: 16px;
                    }

                }

            </style>
        </head>

        <body>

            <main class="blog-container">

                ${
                    article.category
                        ? `<div class="blog-category">
                            ${article.category}
                           </div>`
                        : ""
                }

                <h1>${article.title}</h1>

                ${
                    article.subtitle
                        ? `<div class="subtitle">
                            ${article.subtitle}
                           </div>`
                        : ""
                }

                <div class="meta">

                    ${
                        article.author?.name
                            ? `<span>✍ ${article.author.name}</span>`
                            : ""
                    }

                    ${
                        article.readTime
                            ? `<span>⏱ ${article.readTime}</span>`
                            : ""
                    }

                    ${
                        article.publishedDate
                            ? `<span>
                                📅 ${new Date(
                                    article.publishedDate
                                ).toLocaleDateString()}
                               </span>`
                            : ""
                    }

                </div>

                ${
                    article.bannerImage || article.thumbnail
                        ? `
                        <img
                            class="banner"
                            src="${article.bannerImage || article.thumbnail}"
                            alt="${article.title}"
                        />
                        `
                        : ""
                }

                ${
                    article.summary
                        ? `
                        <section class="summary">
                            <h2>Overview</h2>
                            <p>${article.summary}</p>
                        </section>
                        `
                        : ""
                }

                ${
                    article.author
                        ? `
                        <div class="author">

                            ${
                                article.author.profilePic
                                    ? `
                                    <img
                                        src="${article.author.profilePic}"
                                        alt="${article.author.name}"
                                    />
                                    `
                                    : ""
                            }

                            <div>
                                <div class="author-name">
                                    ${article.author.name || ""}
                                </div>

                                <div class="author-designation">
                                    ${article.author.designation || ""}
                                </div>
                            </div>

                        </div>
                        `
                        : ""
                }

                ${
                    article.mainContent
                        ? `
                        <section class="section">

                            <h2>Article</h2>

                            <div class="content">
                                ${article.mainContent}
                            </div>

                        </section>
                        `
                        : ""
                }

                ${
                    article.keyTakeaways?.length
                        ? `
                        <section class="section">

                            <h2>Key Takeaways</h2>

                            ${article.keyTakeaways
                                .map(
                                    (item, index) => `
                                        <div class="takeaway">

                                            <div class="takeaway-number">
                                                ${index + 1}
                                            </div>

                                            <div>
                                                ${item.point || ""}
                                            </div>

                                        </div>
                                    `
                                )
                                .join("")}

                        </section>
                        `
                        : ""
                }

                ${
                    article.quote?.text
                        ? `
                        <div class="quote">

                            "${article.quote.text}"

                            ${
                                article.quote.author
                                    ? `
                                    <span class="quote-author">
                                        — ${article.quote.author}
                                    </span>
                                    `
                                    : ""
                            }

                        </div>
                        `
                        : ""
                }

                ${
                    article.tags?.length
                        ? `
                        <section class="section">

                            <h2>Tags</h2>

                            <div class="tags">

                                ${article.tags
                                    .map(
                                        tag => `
                                            <span class="tag">
                                                ${
                                                    typeof tag === "object"
                                                        ? tag.name ||
                                                          tag.tag ||
                                                          ""
                                                        : tag
                                                }
                                            </span>
                                        `
                                    )
                                    .join("")}

                            </div>

                        </section>
                        `
                        : ""
                }

            </main>

        </body>
        </html>
        `;

        res.status(200).send(html);

    } catch (error) {
        console.error("Render Blog Error:", error);

        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Server Error</title>
            </head>
            <body>
                <h1>Internal Server Error</h1>
            </body>
            </html>
        `);
    }
};