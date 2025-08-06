const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const mammoth = require("mammoth");
const xmlrpc = require("xmlrpc");
const path = require("path");
const cheerio = require("cheerio");
const axios = require("axios");
const sharp = require("sharp"); // 🆕 FAST image processing

// Import the blog template generator
const { generateBlogTemplate } = require("./blogTemplate");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Odoo connection config
const ODOO_URL = "https://hello-store.odoo.com/";
const ODOO_DB = "hello-store";
const ODOO_USERNAME = "aakash.sharma.qss@gmail.com";
const ODOO_PASSWORD = "testingapiodoo";
const ODOO_BLOG_ID = 1;

// Load API keys from JSON
const keysFile = path.join(__dirname, "auth_keys.json");
let AUTH_KEYS = {};
try {
  AUTH_KEYS = JSON.parse(fs.readFileSync(keysFile, "utf8"));
} catch (err) {
  console.error("Failed to load auth_keys.json:", err.message);
}

// Utility functions
function cleanBlogTitle(raw) {
  if (!raw) return "Untitled";
  let clean = raw.replace(/<br\s*\/?>/gi, " ")
    .replace(/class="ProseMirror-trailingBreak"/gi, "");
  clean = clean.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return clean;
}

function removeH1FromContent(html) {
  return html.replace(/<h1[^>]*>.*?<\/h1>/i, "");
}

// IMPROVED: Only remove SurferSEO overlay, not normal blog fields
function removeSurferEditorUIMarkup(html) {
  const $ = cheerio.load(html);

  // 1. Remove any block/div that contains only SurferSEO UI BUT DOES NOT contain <img> tags
  $("div, section, form").each(function () {
    if ($(this).find('img').length > 0) {
      return; // Skip removal if it contains images
    }
    const blockText = $(this).text().replace(/\s+/g, ' ').trim();
    if (
      /^(Add from Pixabay|Upload|Describe the image|Type alt text|Add image alt text|Clear alt text|or drag and drop an image here|🗑|trash|delete)+$/i.test(blockText)
      || /(Add from Pixabay|Upload).*alt text/i.test(blockText)
      || /(drag and drop an image here)/i.test(blockText)
    ) {
      $(this).remove();
    }
  });

  // 2. Remove any input or textarea with alt/desc placeholder
  $("input, textarea").each(function () {
    const ph = ($(this).attr('placeholder') || '').toLowerCase();
    if (ph.includes('alt text') || ph.includes('describe') || ph.includes('image you')) {
      $(this).remove();
    }
  });

  // 3. Remove overlays that are spans or paragraphs with only helper text
  $("span, p, label, button").each(function () {
    const t = $(this).text().toLowerCase();
    if (
      t.includes('add image alt text') ||
      t.includes('describe the image') ||
      t.includes('add from pixabay') ||
      t.includes('upload') ||
      t.includes('clear alt text') ||
      t.includes('drag and drop an image here')
    ) {
      $(this).remove();
    }
  });

  // 4. Remove any <svg> (icon), trash, or known button with 'delete' or '🗑'
  $("svg, button, [aria-label]").each(function () {
    const aria = ($(this).attr('aria-label') || '').toLowerCase();
    if (
      aria.includes('delete') ||
      aria.includes('trash') ||
      $(this).text().includes('🗑')
    ) {
      $(this).remove();
    }
  });

  return $.html();
}

// 🆕 Clean up +, dots, and symbol artifacts around tables, but NEVER touch images
function cleanTableMarkup(html) {
  const $ = cheerio.load(html);

  // Remove symbols before and after each table, only if element doesn't contain <img>
  $('table').each(function () {
    const table = $(this);
    // Remove previous sibling nodes if they're just symbols and don't have images
    let prev = table.prev();
    while (prev.length && (prev.is('p') || prev.is('div') || prev.get(0).type === 'text')) {
      const text = prev.text().trim();
      // Only remove if no images are contained
      if (
        /^[\+\.\s\-\*\u2022\u2023\u25E6\u2043\u2219]*$/.test(text) &&
        text.length < 8 &&
        prev.find('img').length === 0
      ) {
        const toRemove = prev;
        prev = prev.prev();
        toRemove.remove();
      } else {
        break;
      }
    }
    // Remove next sibling nodes if they're just symbols and don't have images
    let next = table.next();
    while (next.length && (next.is('p') || next.is('div') || next.get(0).type === 'text')) {
      const text = next.text().trim();
      if (
        /^[\+\.\s\-\*\u2022\u2023\u25E6\u2043\u2219]*$/.test(text) &&
        text.length < 8 &&
        next.find('img').length === 0
      ) {
        const toRemove = next;
        next = next.next();
        toRemove.remove();
      } else {
        break;
      }
    }
  });
  // Remove standalone paragraphs/divs with just symbols and no <img>
  $('p, div').each(function () {
    const text = $(this).text().trim();
    if (
      /^[\+\.\s\-\*\u2022\u2023\u25E6\u2043\u2219]*$/.test(text) &&
      text.length < 8 &&
      $(this).find('img').length === 0
    ) {
      $(this).remove();
    }
  });
  // Remove common HTML entities that are just symbols
  let cleanedHtml = $.html();
  cleanedHtml = cleanedHtml
    .replace(/&plus;/gi, '')
    .replace(/&#43;/g, '')
    .replace(/&#8226;/g, '') // bullet
    .replace(/&bull;/g, '')
    .replace(/&hellip;/g, '')
    .replace(/&#8230;/g, '');
  return cleanedHtml;
}

// 🆕 Process all inline images (not banner!)
async function processInlineImages(html) {
  const $ = cheerio.load(html);
  const images = $("img");
  console.log(`🖼️ Processing ${images.length} inline images...`);

  for (let i = 0; i < images.length; i++) {
    const img = $(images[i]);
    const src = img.attr("src");
    if (src && /^https?:/i.test(src)) {
      try {
        console.log(`📸 Processing image ${i + 1}: ${src}`);
        const response = await axios.get(src, {
          responseType: "arraybuffer",
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        const resizedBuffer = await sharp(response.data)
          .resize(1920, 1080, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        const base64 = resizedBuffer.toString('base64');
        img.attr("src", `data:image/jpeg;base64,${base64}`);
        img.attr("style", "width: 860px; height: auto; max-width: 100%; display: block; margin: 20px auto;");
        console.log(`✅ Processed image ${i + 1} successfully`);
      } catch (error) {
        console.error(`❌ Failed to process image ${i + 1}:`, error.message);
      }
    }
  }
  return $.html();
}

function generateTOC(html) {
  const headings = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>|<h3[^>]*>(.*?)<\/h3>/gi)];
  if (!headings.length) return { html, toc: "" };
  let updated = html;
  const toc = headings.map((m, i) => {
    const level = m[0].startsWith("<h2") ? "h2" : "h3";
    const text = m[1] || m[2];
    const anchor = `toc-${i}`;
    updated = updated.replace(
      m[0],
      `<${level} id="${anchor}">${text}</${level}>`
    );
    return `<li style="margin-left:${level === "h3" ? "20px" : "0"};"><a href="#${anchor}">${text}</a></li>`;
  }).join("");
  return { html: updated, toc };
}

function extractBanner(html) {
  console.log("🔍 Starting banner extraction...");
  const $ = cheerio.load(html);
  let bannerUrl = null;

  // Find the first H1 element
  const firstH1 = $("h1").first();

  if (firstH1.length === 0) {
    console.log("⚠️ No H1 found, no banner extraction");
    return { bannerUrl: null, cleanedHtml: html };
  }

  // Find the first image immediately after H1
  let bannerImg = null;
  let currentElement = firstH1.next();

  while (currentElement.length && !bannerImg) {
    if (currentElement.is('img')) {
      bannerImg = currentElement;
      break;
    }
    const childImg = currentElement.find('img').first();
    if (childImg.length) {
      bannerImg = childImg;
      break;
    }
    if (currentElement.is('h1, h2, h3, h4, h5, h6')) break;
    if (currentElement.is('p') && currentElement.text().trim().length > 50) break;
    currentElement = currentElement.next();
  }

  if (bannerImg && bannerImg.length > 0) {
    bannerUrl = bannerImg.attr("src");
    // Remove ALL images that match the banner (even if base64 strings have spaces etc)
    if (/^data:image\/[^;]+;base64,/.test(bannerUrl)) {
      // It’s a base64 image
      const b64data = bannerUrl.split(",")[1].replace(/\s+/g,"");
      $('img').each(function() {
        const src = ($(this).attr('src')||'').replace(/\s+/g,"");
        if (src.startsWith('data:image/') && src.split(',')[1] && src.split(',')[1].replace(/\s+/g,"") === b64data) {
          $(this).remove();
        }
      });
    } else {
      // Normal img
      $(`img[src="${bannerUrl}"]`).remove();
    }
    console.log("✅ Banner image(s) removed from content");
  } else {
    console.log("⚠️ No image found immediately after H1 for banner extraction");
  }

  return { bannerUrl, cleanedHtml: $.html() };
}


async function imageUrlToBase64(imageUrl) {
  console.log("⬇️ Attempting to download image:", imageUrl);
  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    console.log("✅ Image downloaded successfully, size:", response.data.length, "bytes");
    const base64 = Buffer.from(response.data, "binary").toString("base64");
    console.log("✅ Image converted to base64, length:", base64.length);
    return base64;
  } catch (error) {
    console.error("❌ Failed to download/convert image:", error.message);
    throw error;
  }
}

async function upsertBlogInOdoo(title, html, bannerBase64 = null) {
  console.log("🚀 Starting Odoo upload for:", title);
  console.log("📦 Banner base64 provided:", !!bannerBase64);
  return new Promise((resolve, reject) => {
    const common = xmlrpc.createClient({ url: `${ODOO_URL}/xmlrpc/2/common` });
    const object = xmlrpc.createClient({ url: `${ODOO_URL}/xmlrpc/2/object` });
    common.methodCall(
      "authenticate",
      [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {}],
      (err, uid) => {
        if (err || !uid) {
          console.error("❌ Odoo authentication failed:", err);
          return reject("Authentication with Odoo failed");
        }
        console.log("✅ Odoo authentication successful, UID:", uid);
        object.methodCall(
          "execute_kw",
          [
            ODOO_DB,
            uid,
            ODOO_PASSWORD,
            "blog.post",
            "search",
            [[["name", "=", title]]],
          ],
          (err2, result) => {
            if (err2) {
              console.error("❌ Odoo search failed:", err2);
              return reject(err2);
            }
            console.log("🔍 Blog search result:", result);
            const blogData = {
              name: title,
              content: html,
              blog_id: ODOO_BLOG_ID,
              website_published: false,
            };

            if (bannerBase64) {
              blogData.cover_properties = JSON.stringify({
                "background-image": `url(data:image/jpeg;base64,${bannerBase64})`,
                resize_class: "o_record_has_cover",
              });
              console.log("🖼️ Added banner image to blog cover_properties");
            } else {
              // Explicitly clear the banner if no image detected
              blogData.cover_properties = "{}";
              console.log("🧹 Removed banner image from cover_properties");
            }

            console.log("📝 Blog data keys:", Object.keys(blogData));
            if (result.length) {
              console.log("🔄 Updating existing blog post with ID:", result[0]);
              object.methodCall(
                "execute_kw",
                [
                  ODOO_DB,
                  uid,
                  ODOO_PASSWORD,
                  "blog.post",
                  "write",
                  [result, blogData],
                ],
                (err3, success) => {
                  if (err3 || !success) {
                    console.error("❌ Odoo update failed:", err3);
                    return reject(err3 || "Failed to update");
                  }
                  console.log("✅ Blog post updated successfully");
                  resolve(result[0]);
                }
              );
            } else {
              console.log("📝 Creating new blog post");
              object.methodCall(
                "execute_kw",
                [
                  ODOO_DB,
                  uid,
                  ODOO_PASSWORD,
                  "blog.post",
                  "create",
                  [blogData],
                ],
                (err4, blog_id) => {
                  if (err4) {
                    console.error("❌ Odoo create failed:", err4);
                    return reject(err4);
                  }
                  console.log(
                    "✅ Blog post created successfully with ID:",
                    blog_id
                  );
                  resolve(blog_id);
                }
              );
            }
          }
        );
      }
    );
  });
}

function logUpload(title, blog_id, uploader) {
  try {
    const csvLogPath = path.join(__dirname, "upload_logs.csv");
    if (!fs.existsSync(csvLogPath)) {
      fs.writeFileSync(csvLogPath, "Title,Blog ID,Uploaded By,Date,Time\n", "utf8");
    }
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const [datePart, timePart] = now.split(", ");
    const [m, d, y] = datePart.split("/");
    fs.appendFileSync(
      csvLogPath,
      `"${title}",${blog_id},"${uploader}","${d}/${m}/${y}","${timePart}"\n`,
      "utf8"
    );
  } catch (err) {
    console.error("Failed to log upload:", err.message);
  }
}

// API Routes
app.get("/", (req, res) => {
  res.send("Odoo Blog Node API is running 🚀");
});

app.post("/check-blog-exists", async (req, res) => {
  try {
    const title = req.body.title;
    if (!title) return res.status(400).json({ error: "No title provided" });
    const common = xmlrpc.createClient({ url: `${ODOO_URL}/xmlrpc/2/common` });
    const object = xmlrpc.createClient({ url: `${ODOO_URL}/xmlrpc/2/object` });
    common.methodCall(
      "authenticate",
      [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {}],
      (err, uid) => {
        if (err || !uid)
          return res.status(500).json({ error: "Authentication failed" });
        object.methodCall(
          "execute_kw",
          [
            ODOO_DB,
            uid,
            ODOO_PASSWORD,
            "blog.post",
            "search",
            [[["name", "=", title]]],
          ],
          (err2, result) => {
            if (err2) return res.status(500).json({ error: "Search failed" });
            res.json(result.length ? { exists: true, blog_id: result } : { exists: false });
          }
        );
      }
    );
  } catch (err) {
    res
      .status(500)
      .json({ error: "Unexpected error", details: err.message });
  }
});

app.post("/upload-html-blog", async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 NEW BLOG UPLOAD REQUEST");
  console.log("=".repeat(50));
  try {
    const html = req.body.html;
    const apiKey = req.headers["x-api-key"];
    console.log("📝 HTML content length:", html?.length || 0);
    console.log("🔑 API Key provided:", !!apiKey);
    if (!html) return res.status(400).json({ error: "No HTML received" });
    if (!apiKey || !AUTH_KEYS[apiKey])
      return res.status(401).json({ error: "Invalid or missing API key" });
    const uploader = AUTH_KEYS[apiKey];
    console.log("👤 Uploader:", uploader);
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const rawTitle = titleMatch ? titleMatch[1] : "Untitled";
    const title = cleanBlogTitle(rawTitle);
    console.log("📰 Blog title:", title);
    const contentHTML = removeH1FromContent(html);
    console.log("📝 Content after H1 removal length:", contentHTML.length);
    // --- BANNER IMAGE SECTION ---
    const { bannerUrl, cleanedHtml } = extractBanner(contentHTML);
    let bannerBase64 = null;
if (bannerUrl) {
  if (/^https?:/i.test(bannerUrl)) {
    try {
      bannerBase64 = await imageUrlToBase64(bannerUrl);
      console.log("✅ Banner image processed successfully from URL");
    } catch (e) {
      console.error("❌ Failed to fetch/convert banner image:", e.message);
    }
  } else if (/^data:image\/[^;]+;base64,/.test(bannerUrl)) {
    // It's already a base64 data URL
    const match = bannerUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (match) {
      bannerBase64 = match[1];
      console.log("✅ Banner image extracted from base64 data URL");
    } else {
      console.log("⚠️ Failed to extract base64 from data URL for banner");
    }
  } else {
    console.log("⚠️ Banner URL is not HTTP/HTTPS or base64 data URL:", bannerUrl);
  }
} else {
  console.log("ℹ️ No banner URL found");
}


    // 👉 Clean the Surfer Editor UI markup
    const cleanedHtmlNoUI = removeSurferEditorUIMarkup(cleanedHtml);
    // 🆕 Clean symbols and dots around tables! (should NOT remove images)
    const tableCleanedHtml = cleanTableMarkup(cleanedHtmlNoUI);
    // 🆕 Process inline images (not banner!) AFTER table cleaning
    const processedImagesHTML = await processInlineImages(tableCleanedHtml);
    const { html: updatedHTML, toc } = generateTOC(processedImagesHTML);
    console.log("📋 TOC generated, entries:", (toc.match(/<li/g) || []).length);
    const styledHTML = generateBlogTemplate(updatedHTML, toc, uploader);
    console.log("🎨 Styled HTML generated, length:", styledHTML.length);
    const blog_id = await upsertBlogInOdoo(title, styledHTML, bannerBase64);
    logUpload(title, blog_id, uploader);
    console.log("🎉 SUCCESS! Blog uploaded with ID:", blog_id);
    res.json({
      message: "HTML Blog posted to Odoo",
      blog_id,
      title,
      uploaded_by: uploader,
    });
  } catch (err) {
    console.error("💥 ERROR in /upload-html-blog:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: "Failed to post HTML", details: err.message });
  }
});

app.post("/upload-docx-blog", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  try {
    const options = {
      styleMap: [
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2",
        "p[style-name='Heading 3'] => h3"
      ],
      convertImage: mammoth.images.inline(element => element.read("base64").then(data => ({
        src: `data:${element.contentType};base64,${data}`
      }))),
    };
    const result = await mammoth.convertToHtml({ path: filePath }, options);
    let html = result.value;
    const rawText = await mammoth.extractRawText({ path: filePath });
    const rawTitle = rawText.value.split("\n").find(line => line.trim()) || "Untitled";
    const title = cleanBlogTitle(rawTitle);
    const contentWithoutH1 = removeH1FromContent(html);
    // --- BANNER IMAGE SECTION ---
    const { bannerUrl, cleanedHtml } = extractBanner(contentWithoutH1);
    let bannerBase64 = null;
    if (bannerUrl && /^https?:/i.test(bannerUrl)) {
      try {
        bannerBase64 = await imageUrlToBase64(bannerUrl);
      } catch (e) {
        console.error("Failed to fetch/convert banner image:", e && e.message);
      }
    }
    // 👉 Clean the Surfer Editor UI markup for docx, too
    const cleanedHtmlNoUI = removeSurferEditorUIMarkup(cleanedHtml);
    // 🆕 Clean symbols and dots around tables! (should NOT remove images)
    const tableCleanedHtml = cleanTableMarkup(cleanedHtmlNoUI);
    // 🆕 Process inline images (not banner!) AFTER table cleaning
    const processedImagesHTML = await processInlineImages(tableCleanedHtml);
    const { html: updatedHTML, toc } = generateTOC(processedImagesHTML);
    fs.unlinkSync(filePath);
    const styledHTML = generateBlogTemplate(updatedHTML, toc, "DOCX Upload");
    const blog_id = await upsertBlogInOdoo(title, styledHTML, bannerBase64);
    res.json({ message: "DOCX blog uploaded to Odoo", blog_id, title });
  } catch (err) {
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error("🚨 UNCAUGHT ERROR:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at https://walleye-allowing-stingray.ngrok-free.app`);
});
