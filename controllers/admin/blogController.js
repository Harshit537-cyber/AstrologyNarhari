const Article = require('../../models/Articles/Article')


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
          background:#0b0b0b;
          color:white;
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
          background:#0b0b0b;
          color:#fff;
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
            padding: 50px 20px 80px;
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
            line-height: 1.8;
          }

          .content h1,
          .content h2,
          .content h3 {
            color: #d4af37;
          }

          .content img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
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
              ? `
                <div class="blog-category">
                  ${article.category}
                </div>
              `
              : ""
          }

          <h1>
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

            ${
              article.readTime
                ? `<span>⏱ ${article.readTime}</span>`
                : ""
            }

            ${
              article.publishedDate
                ? `
                  <span>
                    📅 ${new Date(
                      article.publishedDate
                    ).toLocaleDateString()}
                  </span>
                `
                : ""
            }

          </div>

          ${
            article.bannerImage || article.thumbnail
              ? `
                <img
                  class="banner"
                  src="${article.bannerImage || article.thumbnail}"
                  alt="${article.title || "Blog"}"
                />
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

                  <h2>
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

                  <h2>
                    Key Takeaways
                  </h2>

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

                  <h2>
                    Tags
                  </h2>

                  <div class="tags">

                    ${article.tags
                      .map(
                        (tag) => `
                          <span class="tag">
                            ${tag}
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

    return res.status(200).send(html);

  } catch (error) {

    console.error("Render Blog Error:", error);

    return res.status(500).send(`
      <!DOCTYPE html>

      <html>

      <head>
        <title>Server Error</title>
      </head>

      <body>
        <h1>Internal Server Error</h1>
        <p>${error.message}</p>
      </body>

      </html>
    `);
  }
}