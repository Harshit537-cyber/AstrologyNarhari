const Article = require("../../models/Articles/Article");

const NAMAH_ASTRO_LOGO = "data:image/png;base64,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";

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

    // Fetch recent blogs for the side list
    const recentBlogs = await Article.find({
      isPublished: true,
      slug: { $ne: slug },
    })
      .sort({ publishedDate: -1, createdAt: -1 })
      .limit(6)
      .select("title slug thumbnail bannerImage category readTime publishedDate")
      .lean();

    const html = `
      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>${article.title || "Blog"} - NamahAstro</title>

        <link rel="icon" type="image/png" href="${NAMAH_ASTRO_LOGO}">

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

          *, *::before, *::after {
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
            background-color: #ffffff;
            color: #2d3748;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.85;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* Full Width Navbar (Simple & Clean) */
          .full-navbar {
            width: 100%;
            background: #ffffff;
            border-bottom: 1px solid #edf2f7;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          }

          .nav-container {
            max-width: 1360px;
            width: 100%;
            margin: 0 auto;
            padding: 16px 32px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            box-sizing: border-box;
          }

          /* Unclickable Brand Logo */
          .brand-logo-unclickable {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            user-select: none;
            cursor: default;
          }

          .brand-logo-img {
            width: 38px;
            height: 38px;
            object-fit: contain;
            display: inline-block;
          }

          .logo-text {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.02em;
          }

          .logo-text span {
            color: #b48a14;
          }

          /* Full Page Main Layout Container */
          .page-main-container {
            max-width: 1360px;
            width: 100%;
            margin: 32px auto 60px;
            padding: 0 32px;
            box-sizing: border-box;
          }

          /* HERO SECTION: Blog Image on Left, Recent Posts on Right */
          .hero-section {
            display: flex;
            gap: 36px;
            align-items: flex-start;
            margin-bottom: 35px;
            width: 100%;
          }

          .hero-image-col {
            flex: 1;
            min-width: 0;
          }

          .hero-banner {
            width: 100%;
            max-height: 460px;
            height: auto;
            min-height: 320px;
            object-fit: cover;
            display: block;
            border-radius: 14px;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
          }

          /* Recent Posts on the Right Side */
          .hero-recent-col {
            flex: 0 0 360px;
            width: 360px;
            box-sizing: border-box;
          }

          .recent-heading {
            color: #d97706;
            font-size: 21px;
            font-weight: 700;
            margin: 0 0 16px 0;
            letter-spacing: -0.01em;
          }

          .recent-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .recent-card {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            text-decoration: none;
            color: inherit;
            transition: transform 0.15s ease;
          }

          .recent-card:hover {
            transform: translateX(3px);
          }

          .recent-card-thumb {
            width: 95px;
            height: 68px;
            border-radius: 8px;
            overflow: hidden;
            flex-shrink: 0;
            background: #f1f5f9;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
          }

          .recent-card-thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .recent-thumb-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fdf8eb;
            font-size: 22px;
          }

          .recent-card-body {
            flex: 1;
            min-width: 0;
          }

          .recent-card-title {
            color: #d97706;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.45;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            transition: color 0.15s ease;
          }

          .recent-card:hover .recent-card-title {
            color: #b45309;
          }

          .no-recent {
            color: #64748b;
            font-size: 14px;
            font-style: italic;
          }

          /* BLOG INFORMATION SECTION (Below the Image) */
          .blog-info-wrapper {
            width: 100%;
            max-width: 980px;
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
            margin-bottom: 18px;
            border: 1px solid #f4e8cb;
          }

          h1.blog-title {
            font-size: 40px;
            line-height: 1.28;
            font-weight: 800;
            margin: 0 0 16px;
            color: #0f172a;
            letter-spacing: -0.02em;
            word-wrap: break-word;
            overflow-wrap: anywhere;
          }

          .subtitle {
            font-size: 20px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 22px;
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
            font-size: 14.5px;
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
            font-size: 16px;
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
            max-width: 600px;
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
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid #f4e8cb;
          }

          /* STRICT CONTENT CONTAINMENT (Nothing overflows) */
          .content {
            width: 100% !important;
            max-width: 100% !important;
            font-size: 17.5px;
            color: #334155;
            line-height: 1.88;
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
            margin: 0 0 20px 0;
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
            margin: 32px 0 14px 0;
            word-wrap: break-word !important;
            overflow-wrap: anywhere !important;
          }

          .content h1 { font-size: 30px; }
          .content h2 { font-size: 24px; color: #926f0d; border-bottom: 1px solid #f3e9d2; padding-bottom: 6px; }
          .content h3 { font-size: 21px; color: #1e293b; }
          .content h4 { font-size: 18px; }

          .content img {
            display: block !important;
            max-width: 100% !important;
            width: auto !important;
            height: auto !important;
            border-radius: 12px;
            margin: 28px auto !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
            object-fit: contain !important;
            float: none !important;
            clear: both !important;
          }

          .content figure {
            max-width: 100% !important;
            margin: 28px auto !important;
            text-align: center !important;
            clear: both !important;
          }

          .content figcaption {
            font-size: 14px;
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
            margin: 24px auto !important;
            display: block !important;
          }

          .content table {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            border-collapse: collapse;
            margin: 24px 0 !important;
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
            margin: 16px 0 22px 24px;
            padding-left: 6px;
          }

          .content li {
            margin-bottom: 8px;
            line-height: 1.75;
          }

          .content blockquote {
            margin: 28px 0;
            padding: 20px 24px;
            background: #fffcf4;
            border-left: 4px solid #b48a14;
            border-radius: 0 12px 12px 0;
            font-style: italic;
            color: #475569;
            font-size: 17.5px;
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
            padding: 16px 20px;
            margin: 20px 0;
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
            font-size: 16px;
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
            font-size: 19.5px;
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
            font-size: 15px;
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

          /* Full Width Footer */
          .full-footer {
            width: 100%;
            background: #ffffff;
            border-top: 1px solid #edf2f7;
            padding: 40px 32px 32px;
            box-sizing: border-box;
            margin-top: 70px;
          }

          .footer-container {
            max-width: 1360px;
            width: 100%;
            margin: 0 auto;
            text-align: center;
          }

          .footer-logo-wrapper {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 8px;
            user-select: none;
            cursor: default;
          }

          .footer-logo-img {
            width: 32px;
            height: 32px;
            object-fit: contain;
            display: inline-block;
          }

          .footer-logo-text {
            font-size: 21px;
            font-weight: 800;
            color: #0f172a;
          }

          .footer-logo-text span {
            color: #b48a14;
          }

          .footer-tagline {
            font-size: 14px;
            color: #64748b;
            margin-top: 4px;
          }

          .footer-divider {
            height: 1px;
            background: #e2e8f0;
            margin: 24px 0 20px;
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

          /* Responsive Tweaks */
          @media (max-width: 992px) {
            .hero-section {
              flex-direction: column;
              gap: 28px;
            }

            .hero-recent-col {
              width: 100%;
              flex: auto;
            }

            .page-main-container {
              padding: 0 20px;
              margin-top: 24px;
            }

            h1.blog-title {
              font-size: 30px;
            }
          }

          @media (max-width: 768px) {
            .nav-container {
              padding: 14px 20px;
            }

            .logo-text {
              font-size: 20px;
            }

            .brand-logo-img {
              width: 32px;
              height: 32px;
            }

            .hero-banner {
              min-height: 220px;
              max-height: 300px;
            }

            h1.blog-title {
              font-size: 24px;
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
              font-size: 16px;
            }

            .quote {
              padding: 20px 18px;
              font-size: 17px;
            }

            .full-footer {
              padding: 30px 20px 24px;
            }

            .footer-bottom {
              flex-direction: column;
              text-align: center;
              gap: 8px;
            }
          }

        </style>

      </head>

      <body>

        <!-- Full Width Top Navbar (Clean with Unclickable Brand) -->
        <header class="full-navbar">
          <div class="nav-container">
            <div class="brand-logo-unclickable" title="NamahAstro">
              <img src="${NAMAH_ASTRO_LOGO}" alt="NamahAstro Logo" class="brand-logo-img" />
              <span class="logo-text">Namah<span>Astro</span></span>
            </div>
          </div>
        </header>

        <!-- Full Page Main Container -->
        <div class="page-main-container">

          <!-- TOP HERO SECTION: Blog Image on Left, Recent Posts on Right -->
          <div class="hero-section">

            <!-- Left: Blog Featured Image -->
            <div class="hero-image-col">
              <img
                class="hero-banner"
                src="${article.bannerImage || article.thumbnail || "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80"}"
                alt="${article.title || "Blog"}"
              />
            </div>

            <!-- Right: Recent Posts (Screenshot style) -->
            <div class="hero-recent-col">
              <h3 class="recent-heading">Recent Post:</h3>

              ${
                recentBlogs && recentBlogs.length > 0
                  ? `
                    <div class="recent-list">
                      ${recentBlogs
                        .map(
                          (item) => `
                            <a href="/article/blog/${item.slug}" class="recent-card">
                              <div class="recent-card-thumb">
                                ${
                                  item.thumbnail || item.bannerImage
                                    ? `<img src="${item.thumbnail || item.bannerImage}" alt="${item.title || "Blog"}" />`
                                    : `<div class="recent-thumb-fallback">📖</div>`
                                }
                              </div>
                              <div class="recent-card-body">
                                <h4 class="recent-card-title">${item.title || "Untitled Article"}</h4>
                              </div>
                            </a>
                          `,
                        )
                        .join("")}
                    </div>
                  `
                  : `
                    <p class="no-recent">No recent posts available.</p>
                  `
              }
            </div>

          </div>

          <!-- BLOG INFORMATION SECTION (Below the Image, Clean & Full Screen) -->
          <div class="blog-info-wrapper">

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

          </div>

        </div>

        <!-- Full Width Footer (Simple & Clean with Unclickable Brand) -->
        <footer class="full-footer">
          <div class="footer-container">
            <div class="footer-brand">
              <div class="footer-logo-wrapper">
                <img src="${NAMAH_ASTRO_LOGO}" alt="NamahAstro Logo" class="footer-logo-img" />
                <span class="footer-logo-text">Namah<span>Astro</span></span>
              </div>
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
          </div>
        </footer>

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
