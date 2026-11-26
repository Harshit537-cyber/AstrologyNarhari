const Article = require("../../models/Articles/Article");

exports.renderBlogPage = async (req, res) => {
  try {
    console.log("========== BLOG RENDER START ==========");

    const { slug } = req.params;

    console.log("BLOG SLUG:", slug);

    const article = await Article.findOne({
      slug: slug,
      isPublished: true,
    }).lean();

    console.log("ARTICLE FOUND:", !!article);

    if (!article) {
      console.log("ARTICLE NOT FOUND FOR SLUG:", slug);

      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Blog Not Found</title>
        </head>

        <body style="
          background:#fafafa;
          color:#1a1a1a;
          font-family:Arial;
          text-align:center;
          padding:50px;
        ">

          <h1>Blog Not Found</h1>

          <p>
            No published article found for slug:
            <strong>${slug}</strong>
          </p>

        </body>
        </html>
      `);
    }

    console.log("ARTICLE ID:", article._id);
    console.log("ARTICLE TITLE:", article.title);
    console.log("ARTICLE SLUG:", article.slug);
    console.log("ARTICLE PUBLISHED:", article.isPublished);
    console.log("ARTICLE AUTHOR:", article.author);
    console.log("ARTICLE TAGS:", article.tags);

    // Fetch recent blogs for the popup modal
    const recentBlogs = await Article.find({
      isPublished: true,
      slug: { $ne: slug },
    })
      .sort({ publishedDate: -1, createdAt: -1 })
      .limit(6)
      .select("title slug thumbnail bannerImage category readTime publishedDate")
      .lean();

    // Blog HTML render starts here

    const html = `
      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>${article.title || "Blog"}</title>

        <meta
          name="description"
          content="${article.summary || ""}"
        >

        <meta
          property="og:title"
          content="${article.title || ""}"
        >

        <meta
          property="og:description"
          content="${article.summary || ""}"
        >

        <meta
          property="og:image"
          content="${article.bannerImage || article.thumbnail || ""}"
        >

        <meta
          property="og:type"
          content="article"
        >

        <meta
          property="og:url"
          content="${article.blogLink || ""}"
        >

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">

        <style>

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          html, body {
            width: 100%;
            min-height: 100%;
            overflow-x: hidden;
          }

          body {
            background-color: #f1f4f9;
            color: #2d3748;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.8;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            padding: 40px 16px;
          }

          /* Main Unified Frame with Grey Blur Border */
          .page-wrapper {
            max-width: 860px;
            width: 100%;
            margin: 0 auto;
            box-sizing: border-box;
          }

          .blog-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 50px 45px;
            border: 1.5px solid #cbd5e1;
            box-shadow: 0 0 28px 6px rgba(148, 163, 184, 0.45), 0 12px 40px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }

          .blog-category {
            display: inline-flex;
            align-items: center;
            padding: 6px 16px;
            border-radius: 50px;
            background: #fdf8eb;
            color: #b48a14;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 20px;
            border: 1px solid #f4e8cb;
          }

          h1.blog-title {
            font-size: 38px;
            line-height: 1.3;
            font-weight: 800;
            margin: 0 0 16px;
            color: #0f172a;
            letter-spacing: -0.02em;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }

          .subtitle {
            font-size: 19px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 24px;
            font-weight: 400;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }

          .meta {
            display: flex;
            align-items: center;
            gap: 18px;
            flex-wrap: wrap;
            color: #64748b;
            font-size: 14px;
            font-weight: 500;
            padding-bottom: 24px;
            margin-bottom: 28px;
            border-bottom: 1px solid #f1f5f9;
          }

          .meta span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .banner-wrapper {
            margin-bottom: 35px;
            overflow: hidden;
            border-radius: 16px;
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.06);
            width: 100%;
          }

          .banner {
            width: 100%;
            max-height: 480px;
            object-fit: cover;
            display: block;
          }

          .summary {
            padding: 24px 28px;
            border-left: 4px solid #b48a14;
            background: #fdfbf7;
            border-radius: 0 14px 14px 0;
            margin-bottom: 35px;
            border-top: 1px solid #f8f1e1;
            border-right: 1px solid #f8f1e1;
            border-bottom: 1px solid #f8f1e1;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }

          .summary h2 {
            color: #b48a14;
            font-size: 19px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 8px;
          }

          .summary p {
            color: #475569;
            font-size: 15.5px;
            line-height: 1.7;
            margin: 0;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }

          .author {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 18px 22px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            margin: 30px 0 40px;
          }

          .author img {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #fdf8eb;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
            flex-shrink: 0;
          }

          .author-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 15.5px;
            margin-bottom: 2px;
          }

          .author-designation {
            color: #64748b;
            font-size: 13.5px;
          }

          .section {
            margin-top: 40px;
            width: 100%;
          }

          .section-title {
            color: #0f172a;
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid #f4e8cb;
          }

          /* STRICT CONTENT CONTAINMENT (Nothing goes outside the frame) */
          .content {
            width: 100% !important;
            max-width: 100% !important;
            font-size: 17px;
            color: #334155;
            line-height: 1.85;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
            overflow-wrap: anywhere !important;
          }

          .content * {
            max-width: 100% !important;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
            overflow-wrap: anywhere !important;
          }

          .content p {
            margin: 0 0 18px 0;
            word-wrap: break-word !important;
            overflow-wrap: anywhere !important;
          }

          .content h1,
          .content h2,
          .content h3,
          .content h4,
          .content h5,
          .content h6 {
            color: #0f172a;
            font-weight: 700;
            line-height: 1.35;
            margin: 30px 0 14px 0;
            word-wrap: break-word !important;
            overflow-wrap: anywhere !important;
          }

          .content h1 { font-size: 28px; }
          .content h2 { font-size: 23px; color: #926f0d; border-bottom: 1px solid #f3e9d2; padding-bottom: 6px; }
          .content h3 { font-size: 20px; color: #1e293b; }
          .content h4 { font-size: 17px; }

          .content img {
            display: block !important;
            max-width: 100% !important;
            width: auto !important;
            height: auto !important;
            border-radius: 12px;
            margin: 26px auto !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
            object-fit: contain !important;
            float: none !important;
            clear: both !important;
          }

          .content figure {
            max-width: 100% !important;
            margin: 26px auto !important;
            text-align: center !important;
            clear: both !important;
          }

          .content figcaption {
            font-size: 13.5px;
            color: #64748b;
            margin-top: 8px;
            font-style: italic;
          }

          .content iframe, 
          .content video, 
          .content embed {
            max-width: 100% !important;
            width: 100% !important;
            aspect-ratio: 16 / 9;
            height: auto !important;
            border-radius: 12px;
            margin: 22px auto !important;
            display: block !important;
          }

          .content table {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            border-collapse: collapse;
            margin: 22px 0 !important;
          }

          .content table * {
            max-width: none !important;
          }

          .content th, .content td {
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
          }

          .content ul,
          .content ol {
            margin: 16px 0 22px 20px;
            padding-left: 10px;
          }

          .content li {
            margin-bottom: 8px;
            line-height: 1.7;
          }

          .content blockquote {
            margin: 26px 0;
            padding: 18px 22px;
            background: #fffcf4;
            border-left: 4px solid #b48a14;
            border-radius: 0 12px 12px 0;
            font-style: italic;
            color: #475569;
            font-size: 17px;
            border-top: 1px solid #fbf4e3;
            border-right: 1px solid #fbf4e3;
            border-bottom: 1px solid #fbf4e3;
          }

          .content a {
            color: #b48a14;
            text-decoration: underline;
            text-underline-offset: 3px;
            font-weight: 600;
            word-break: break-all;
          }

          .content pre,
          .content code {
            white-space: pre-wrap !important;
            word-break: break-all !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            background: #f1f5f9;
            border-radius: 6px;
          }

          .content pre {
            padding: 14px 18px;
            margin: 18px 0;
          }

          .content code {
            padding: 2px 6px;
            font-size: 0.9em;
          }

          .takeaway {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 16px 20px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 12px;
          }

          .takeaway-number {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #b48a14;
            color: #ffffff;
            font-weight: 700;
            font-size: 13.5px;
            flex-shrink: 0;
            box-shadow: 0 2px 6px rgba(180, 138, 20, 0.25);
          }

          .takeaway-text {
            color: #334155;
            font-size: 15.5px;
            line-height: 1.6;
            padding-top: 3px;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }

          .quote {
            margin: 40px 0;
            padding: 28px 30px;
            background: #fffcf4;
            border-radius: 16px;
            border-left: 5px solid #b48a14;
            font-size: 19px;
            line-height: 1.6;
            font-style: italic;
            color: #1e293b;
            border-top: 1px solid #f8f1df;
            border-right: 1px solid #f8f1df;
            border-bottom: 1px solid #f8f1df;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }

          .quote-author {
            display: block;
            margin-top: 12px;
            color: #b48a14;
            font-size: 14.5px;
            font-style: normal;
            font-weight: 600;
          }

          .tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
          }

          .tag {
            padding: 6px 14px;
            border-radius: 50px;
            background: #f1f5f9;
            color: #475569;
            font-size: 13px;
            font-weight: 500;
            border: 1px solid #e2e8f0;
          }

          /* Blog Header Navigation */
          .blog-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            padding: 16px 26px;
            background: #ffffff;
            border-radius: 18px;
            border: 1.5px solid #cbd5e1;
            box-shadow: 0 0 25px rgba(148, 163, 184, 0.25), 0 4px 15px rgba(0, 0, 0, 0.04);
            width: 100%;
            box-sizing: border-box;
          }

          .brand-logo {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            text-decoration: none;
            letter-spacing: -0.02em;
          }

          .brand-logo .logo-gem {
            font-size: 22px;
          }

          .brand-logo .logo-text span {
            color: #b48a14;
          }

          .recent-blogs-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 50px;
            background: #fdf8eb;
            color: #926f0d;
            border: 1.5px solid #e9d5a4;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .recent-blogs-btn:hover {
            background: #b48a14;
            color: #ffffff;
            border-color: #b48a14;
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(180, 138, 20, 0.28);
          }

          /* Blog Footer */
          .blog-footer {
            margin-top: 35px;
            padding: 32px 30px 24px;
            background: #ffffff;
            border-radius: 20px;
            border: 1.5px solid #cbd5e1;
            box-shadow: 0 0 25px rgba(148, 163, 184, 0.2), 0 4px 15px rgba(0, 0, 0, 0.03);
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          }

          .footer-logo {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
          }

          .footer-tagline {
            font-size: 14px;
            color: #64748b;
            margin-top: 6px;
          }

          .footer-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 22px 0 18px;
          }

          .footer-bottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 13.5px;
            color: #64748b;
          }

          .footer-links {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }

          .footer-links a {
            color: #64748b;
            text-decoration: none;
            transition: color 0.15s;
          }

          .footer-links a:hover {
            color: #b48a14;
          }

          .footer-links .dot {
            color: #cbd5e1;
          }

          /* Recent Blogs Popup Modal */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.25s ease, visibility 0.25s ease;
          }

          .modal-overlay.is-open {
            opacity: 1;
            visibility: visible;
          }

          .modal-container {
            background: #ffffff;
            border-radius: 22px;
            max-width: 600px;
            width: 100%;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25), 0 0 35px rgba(148, 163, 184, 0.3);
            border: 1.5px solid #cbd5e1;
            transform: scale(0.95);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
          }

          .modal-overlay.is-open .modal-container {
            transform: scale(1);
          }

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid #f1f5f9;
            background: #f8fafc;
          }

          .modal-title-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .modal-title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }

          .modal-close-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            color: #64748b;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
          }

          .modal-close-btn:hover {
            background: #f1f5f9;
            color: #0f172a;
            transform: rotate(90deg);
          }

          .modal-body {
            padding: 18px 22px;
            overflow-y: auto;
            max-height: calc(85vh - 78px);
          }

          .recent-blogs-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .recent-blog-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 14px 16px;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s ease;
          }

          .recent-blog-item:hover {
            transform: translateY(-2px);
            border-color: #cbd5e1;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
            background: #fdfbf7;
          }

          .item-thumb-wrapper {
            width: 84px;
            height: 68px;
            border-radius: 10px;
            overflow: hidden;
            flex-shrink: 0;
            background: #f1f5f9;
          }

          .item-thumb {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .item-thumb-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            background: #f8fafc;
          }

          .item-info {
            flex: 1;
            min-width: 0;
          }

          .item-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            margin-bottom: 5px;
          }

          .item-category {
            font-weight: 700;
            color: #b48a14;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }

          .item-read-time {
            color: #64748b;
          }

          .item-title {
            font-size: 15.5px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.35;
            margin: 0 0 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .item-date {
            font-size: 12px;
            color: #94a3b8;
          }

          .no-recent-blogs {
            text-align: center;
            padding: 30px;
            color: #64748b;
          }

          @media (max-width: 768px) {
            body {
              padding: 16px 8px;
            }

            .blog-header {
              padding: 12px 16px;
              margin-bottom: 18px;
            }

            .brand-logo {
              font-size: 19px;
            }

            .recent-blogs-btn {
              padding: 8px 14px;
              font-size: 13px;
            }

            .blog-footer {
              padding: 24px 18px 20px;
              margin-top: 25px;
            }

            .footer-bottom {
              flex-direction: column;
              text-align: center;
              gap: 8px;
            }

            .modal-container {
              max-height: 90vh;
              border-radius: 18px;
            }

            .modal-header {
              padding: 16px 18px;
            }

            .modal-body {
              padding: 14px 14px;
            }

            .item-thumb-wrapper {
              width: 70px;
              height: 58px;
            }

            .item-title {
              font-size: 14px;
            }

            .blog-card {
              padding: 26px 16px;
              border-radius: 18px;
              border: 1px solid #cbd5e1;
              box-shadow: 0 0 20px rgba(100, 116, 139, 0.2);
            }

            h1.blog-title {
              font-size: 25px;
              line-height: 1.3;
            }

            .subtitle {
              font-size: 16px;
              margin-bottom: 18px;
            }

            .summary {
              padding: 18px 18px;
            }

            .content {
              font-size: 15.5px;
            }

            .quote {
              padding: 20px 18px;
              font-size: 17px;
            }
          }

        </style>

      </head>

      <body>

        <div class="page-wrapper">
          <!-- Top Header Navigation -->
          <header class="blog-header">
            <a href="/" class="brand-logo" title="NamahAstro">
              <span class="logo-gem">✨</span>
              <span class="logo-text">Namah<span>Astro</span></span>
            </a>

            <button type="button" class="recent-blogs-btn" id="openRecentModalBtn" aria-label="Open Recent Blogs">
              <span class="btn-icon">📚</span>
              <span>Recent Blogs</span>
            </button>
          </header>

          <main class="blog-card">

            ${
              article.category
                ? `
                  <div class="blog-category">
                    ${article.category}
                  </div>
                `
                : ""
            }

            <h1 class="blog-title">
              ${article.title || ""}
            </h1>

            ${
              article.subtitle
                ? `
                  <div class="subtitle">
                    ${article.subtitle}
                  </div>
                `
                : ""
            }

            <div class="meta">

              ${
                article.author?.name
                  ? `<span>✍ ${article.author.name}</span>`
                  : ""
              }

              ${article.readTime ? `<span>⏱ ${article.readTime}</span>` : ""}

              ${
                article.publishedDate
                  ? `
                    <span>
                      📅 ${new Date(article.publishedDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  `
                  : ""
              }

            </div>

            ${
              article.bannerImage || article.thumbnail
                ? `
                  <div class="banner-wrapper">
                    <img
                      class="banner"
                      src="${article.bannerImage || article.thumbnail}"
                      alt="${article.title || "Blog"}"
                    />
                  </div>
                `
                : ""
            }

            ${
              article.summary
                ? `
                  <section class="summary">

                    <h2>
                      Overview
                    </h2>

                    <p>
                      ${article.summary}
                    </p>

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
                            alt="${article.author.name || "Author"}"
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

                    <h2 class="section-title">
                      Article
                    </h2>

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

                    <h2 class="section-title">
                      Key Takeaways
                    </h2>

                    ${article.keyTakeaways
                      .map(
                        (item, index) => `
                          <div class="takeaway">

                            <div class="takeaway-number">
                              ${index + 1}
                            </div>

                            <div class="takeaway-text">
                              ${item.point || ""}
                            </div>

                          </div>
                        `,
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

                    <h2 class="section-title">
                      Tags
                    </h2>

                    <div class="tags">

                      ${article.tags
                        .map(
                          (tag) => `
                            <span class="tag">
                              ${tag}
                            </span>
                          `,
                        )
                        .join("")}

                    </div>

                  </section>
                `
                : ""
            }

          </main>

          <!-- Bottom Footer -->
          <footer class="blog-footer">
            <div class="footer-brand">
              <span class="footer-logo">✨ NamahAstro</span>
              <p class="footer-tagline">Your Trusted Guide to Vedic Wisdom, Destiny & Astrology</p>
            </div>

            <div class="footer-divider"></div>

            <div class="footer-bottom">
              <p class="copyright">© ${new Date().getFullYear()} NamahAstro. All rights reserved.</p>
              <div class="footer-links">
                <a href="#">Privacy Policy</a>
                <span class="dot">•</span>
                <a href="#">Terms of Service</a>
                <span class="dot">•</span>
                <a href="#">Contact Us</a>
              </div>
            </div>
          </footer>
        </div>

        <!-- Recent Blogs Popup Modal -->
        <div class="modal-overlay" id="recentBlogsModal" aria-hidden="true">
          <div class="modal-container">
            <div class="modal-header">
              <div class="modal-title-wrapper">
                <span class="modal-icon">📚</span>
                <h3 class="modal-title">Recent Blogs</h3>
              </div>
              <button type="button" class="modal-close-btn" id="closeRecentModalBtn" aria-label="Close modal">✕</button>
            </div>

            <div class="modal-body">
              ${
                recentBlogs && recentBlogs.length > 0
                  ? `
                    <div class="recent-blogs-list">
                      ${recentBlogs
                        .map(
                          (item) => `
                            <a href="/article/blog/${item.slug}" class="recent-blog-item">
                              <div class="item-thumb-wrapper">
                                ${
                                  item.thumbnail || item.bannerImage
                                    ? `<img src="${item.thumbnail || item.bannerImage}" alt="${item.title || "Blog"}" class="item-thumb" />`
                                    : `<div class="item-thumb-placeholder">📖</div>`
                                }
                              </div>
                              <div class="item-info">
                                <div class="item-meta">
                                  ${item.category ? `<span class="item-category">${item.category}</span>` : ""}
                                  ${item.readTime ? `<span class="item-read-time">⏱ ${item.readTime}</span>` : ""}
                                </div>
                                <h4 class="item-title">${item.title || "Untitled Article"}</h4>
                                ${
                                  item.publishedDate
                                    ? `<span class="item-date">📅 ${new Date(item.publishedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>`
                                    : ""
                                }
                              </div>
                            </a>
                          `,
                        )
                        .join("")}
                    </div>
                  `
                  : `
                    <div class="no-recent-blogs">
                      <p>No other articles available right now.</p>
                    </div>
                  `
              }
            </div>
          </div>
        </div>

        <script>
          (function() {
            const modal = document.getElementById('recentBlogsModal');
            const openBtn = document.getElementById('openRecentModalBtn');
            const closeBtn = document.getElementById('closeRecentModalBtn');

            function openModal() {
              if (modal) {
                modal.classList.add('is-open');
                document.body.style.overflow = 'hidden';
              }
            }

            function closeModal() {
              if (modal) {
                modal.classList.remove('is-open');
                document.body.style.overflow = '';
              }
            }

            if (openBtn) openBtn.addEventListener('click', openModal);
            if (closeBtn) closeBtn.addEventListener('click', closeModal);

            if (modal) {
              modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                  closeModal();
                }
              });
            }

            document.addEventListener('keydown', function(e) {
              if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
                closeModal();
              }
            });
          })();
        </script>

      </body>

      </html>
    `;

    return res.status(200).send(html);
  } catch (error) {
    console.error("========== BLOG RENDER ERROR ==========");
    console.error("ERROR MESSAGE:", error.message);
    console.error("ERROR STACK:", error.stack);
    console.error("FULL ERROR:", error);

    return res.status(500).send(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>Blog Render Error</title>

        <meta charset="UTF-8">

      </head>

      <body style="
        background:#fafafa;
        color:#1a1a1a;
        font-family:Arial;
        padding:40px;
      ">

        <h1>Blog Render Error</h1>

        <h3>Error Message</h3>

        <pre style="
          background:#f2f2f2;
          padding:20px;
          border-radius:10px;
          white-space:pre-wrap;
          color:#c0392b;
        ">${error.message}</pre>

        <h3>Stack</h3>

        <pre style="
          background:#f2f2f2;
          padding:20px;
          border-radius:10px;
          white-space:pre-wrap;
          color:#333;
        ">${error.stack || "No stack available"}</pre>

      </body>

      </html>
    `);
  }
};