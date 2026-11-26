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

    // 👇 YOUR EXISTING HTML CODE STARTS HERE

    if (!article) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Blog Not Found</title>
          <meta charset="UTF-8">
        </head>

        <body style="
          margin:0;
          padding:0;
          font-family:Arial,sans-serif;
          background:#fafafa;
          color:#1a1a1a;
          display:flex;
          justify-content:center;
          align-items:center;
          min-height:100vh;
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

          body {
            background-color: #f7f8fa;
            color: #2d3748;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.8;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .page-wrapper {
            max-width: 860px;
            margin: 40px auto 80px;
            padding: 0 20px;
          }

          .blog-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 50px 48px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
            border: 1px solid #edf0f5;
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
            margin-bottom: 22px;
            border: 1px solid #f4e8cb;
          }

          h1.blog-title {
            font-size: 42px;
            line-height: 1.28;
            font-weight: 800;
            margin: 0 0 16px;
            color: #111827;
            letter-spacing: -0.02em;
          }

          .subtitle {
            font-size: 20px;
            color: #4b5563;
            line-height: 1.6;
            margin-bottom: 25px;
            font-weight: 400;
          }

          .meta {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
            padding-bottom: 25px;
            margin-bottom: 30px;
            border-bottom: 1px solid #f1f3f7;
          }

          .meta span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .banner-wrapper {
            margin-bottom: 40px;
            overflow: hidden;
            border-radius: 18px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
          }

          .banner {
            width: 100%;
            max-height: 500px;
            object-fit: cover;
            display: block;
          }

          .summary {
            padding: 28px 32px;
            border-left: 4px solid #b48a14;
            background: #fdfbf7;
            border-radius: 0 16px 16px 0;
            margin-bottom: 40px;
            border-top: 1px solid #f8f1e1;
            border-right: 1px solid #f8f1e1;
            border-bottom: 1px solid #f8f1e1;
          }

          .summary h2 {
            color: #b48a14;
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 10px;
            letter-spacing: -0.01em;
          }

          .summary p {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.75;
            margin: 0;
          }

          .author {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px 24px;
            background: #fbfcfe;
            border: 1px solid #eef1f6;
            border-radius: 16px;
            margin: 35px 0 45px;
          }

          .author img {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #fdf8eb;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          }

          .author-name {
            font-weight: 700;
            color: #111827;
            font-size: 16px;
            margin-bottom: 3px;
          }

          .author-designation {
            color: #6b7280;
            font-size: 14px;
          }

          .section {
            margin-top: 45px;
          }

          .section-title {
            color: #111827;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.01em;
            margin-bottom: 22px;
            position: relative;
            padding-bottom: 10px;
            border-bottom: 2px solid #f4e8cb;
          }

          /* Modern Rich-Text Content Styles */
          .content {
            font-size: 17.5px;
            color: #374151;
            line-height: 1.85;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          .content p {
            margin: 0 0 20px 0;
          }

          .content h1,
          .content h2,
          .content h3,
          .content h4,
          .content h5,
          .content h6 {
            color: #111827;
            font-weight: 700;
            line-height: 1.35;
            margin: 36px 0 16px 0;
            letter-spacing: -0.01em;
          }

          .content h1 { font-size: 30px; }
          .content h2 { font-size: 25px; color: #926f0d; border-bottom: 1px solid #f3e9d2; padding-bottom: 8px; }
          .content h3 { font-size: 21px; color: #1f2937; }
          .content h4 { font-size: 18px; }

          .content img {
            display: block;
            max-width: 100%;
            height: auto;
            border-radius: 14px;
            margin: 32px auto;
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.07);
          }

          .content ul,
          .content ol {
            margin: 18px 0 24px 22px;
            padding-left: 10px;
          }

          .content li {
            margin-bottom: 10px;
            line-height: 1.75;
          }

          .content blockquote {
            margin: 30px 0;
            padding: 20px 26px;
            background: #fffcf4;
            border-left: 4px solid #b48a14;
            border-radius: 0 14px 14px 0;
            font-style: italic;
            color: #4b5563;
            font-size: 18px;
            border-top: 1px solid #fbf4e3;
            border-right: 1px solid #fbf4e3;
            border-bottom: 1px solid #fbf4e3;
          }

          .content a {
            color: #b48a14;
            text-decoration: underline;
            text-underline-offset: 3px;
            font-weight: 600;
            transition: color 0.15s ease;
          }

          .content a:hover {
            color: #876508;
          }

          .content strong, .content b {
            color: #111827;
            font-weight: 700;
          }

          .takeaway {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 18px 22px;
            background: #fbfcfe;
            border: 1px solid #eef1f6;
            border-radius: 14px;
            margin-bottom: 14px;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }

          .takeaway:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          }

          .takeaway-number {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #b48a14;
            color: #ffffff;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
            box-shadow: 0 2px 6px rgba(180, 138, 20, 0.3);
          }

          .takeaway-text {
            color: #374151;
            font-size: 16px;
            line-height: 1.65;
            padding-top: 3px;
          }

          .quote {
            margin: 45px 0;
            padding: 32px 36px;
            background: #fffcf4;
            border-radius: 18px;
            border-left: 5px solid #b48a14;
            font-size: 21px;
            line-height: 1.6;
            font-style: italic;
            color: #1f2937;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
            border-top: 1px solid #f8f1df;
            border-right: 1px solid #f8f1df;
            border-bottom: 1px solid #f8f1df;
          }

          .quote-author {
            display: block;
            margin-top: 14px;
            color: #b48a14;
            font-size: 15px;
            font-style: normal;
            font-weight: 600;
          }

          .tags {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 12px;
          }

          .tag {
            padding: 7px 16px;
            border-radius: 50px;
            background: #f4f5f8;
            color: #4b5563;
            font-size: 13.5px;
            font-weight: 500;
            border: 1px solid #e5e8ee;
            transition: all 0.15s ease;
          }

          .tag:hover {
            background: #eceef3;
            color: #111827;
          }

          @media (max-width: 768px) {
            .page-wrapper {
              margin: 15px auto 40px;
              padding: 0 12px;
            }

            .blog-card {
              padding: 30px 20px;
              border-radius: 18px;
            }

            h1.blog-title {
              font-size: 28px;
              line-height: 1.3;
            }

            .subtitle {
              font-size: 17px;
              margin-bottom: 20px;
            }

            .meta {
              gap: 14px;
              font-size: 13px;
              margin-bottom: 24px;
              padding-bottom: 18px;
            }

            .summary {
              padding: 20px 22px;
            }

            .content {
              font-size: 16px;
              line-height: 1.8;
            }

            .content h1 { font-size: 24px; }
            .content h2 { font-size: 21px; }
            .content h3 { font-size: 18px; }

            .quote {
              padding: 24px 22px;
              font-size: 18px;
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