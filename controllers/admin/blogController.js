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

          @media (max-width: 768px) {
            body {
              padding: 16px 8px;
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
        </div>

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