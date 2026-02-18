#!/usr/bin/env node

/**
 * RSS Source Sheet Sync Script
 *
 * Downloads source-sheet files (PDFs and images) referenced in the RSS feed,
 * uploads them to R2, and creates source_documents entries in D1.
 *
 * Usage:
 *   node scripts/sync-pdfs.mjs --preview          # Generate pdf-mappings.json
 *   node scripts/sync-pdfs.mjs --local             # Execute against local D1/R2
 *   node scripts/sync-pdfs.mjs --remote            # Execute against production D1/R2
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const RSS_FEED_URL = "https://anchor.fm/s/d89491c4/podcast/rss";
const D1_DB_NAME = "rabbi-kraz-db";
const R2_BUCKET_NAME = "krazywaz-media";
const MAPPINGS_FILE = new URL("./pdf-mappings.json", import.meta.url).pathname;
const DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extract first href from an HTML string (the description field). */
function extractSourceSheetUrl(html) {
  if (!html) return null;
  const m = html.match(/href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/** Returns true for URLs we should skip (rabbikraz.com links). */
function shouldSkipUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host.includes("rabbikraz.com") || host.includes("rabbikraz1");
  } catch {
    return true;
  }
}

/** Convert a Google Drive share link to a direct-download URL. */
function toGDriveDirectUrl(url) {
  // Match /file/d/{ID}/ pattern
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) {
    return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  }
  // Already a direct-download URL or something else — return as-is
  return url;
}

/** Parse RSS XML and return items (mirrors lib/rss-parser.ts logic). */
function parseRSSItems(xmlText) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXML = match[1];

    const getTag = (tag) => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const m = itemXML.match(regex);
      if (!m) return "";
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    };

    const guid = getTag("guid") || getTag("link");
    const title = getTag("title");
    const description = getTag("description") || getTag("content:encoded");

    if (guid && title) {
      items.push({ guid, title, description });
    }
  }

  return items;
}

/** Run a wrangler D1 command and return parsed JSON results. */
function d1Execute(command, env) {
  const flag = env === "remote" ? "--remote" : "--local";
  const escaped = command.replace(/"/g, '\\"');
  const cmd = `npx wrangler d1 execute ${D1_DB_NAME} ${flag} --json --command "${escaped}"`;
  try {
    const out = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    // wrangler outputs JSON array; the query result is in [0].results
    const parsed = JSON.parse(out);
    return parsed[0]?.results ?? [];
  } catch (e) {
    console.error(`  D1 query failed: ${command}`);
    console.error(`  ${e.stderr || e.message}`);
    return null;
  }
}

/** Upload a local file to R2 via wrangler. */
function r2Upload(r2Key, localPath, env, contentType = "application/pdf") {
  const flag = env === "remote" ? "--remote" : "--local";
  const cmd = `npx wrangler r2 object put "${R2_BUCKET_NAME}/${r2Key}" --file "${localPath}" --content-type ${contentType} ${flag}`;
  try {
    execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch (e) {
    console.error(`  R2 upload failed for ${r2Key}: ${e.stderr || e.message}`);
    return false;
  }
}

/** Detect file type from buffer magic bytes. Returns { type, ext, contentType, r2Prefix } or null. */
function detectFileType(buffer) {
  const head = buffer.slice(0, 8);
  const headStr = head.toString("ascii");

  // PDF: starts with %PDF
  if (headStr.startsWith("%PDF")) {
    return { type: "pdf", ext: "pdf", contentType: "application/pdf", r2Prefix: "pdfs" };
  }

  // PNG: 89 50 4E 47
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return { type: "image", ext: "png", contentType: "image/png", r2Prefix: "images" };
  }

  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { type: "image", ext: "jpg", contentType: "image/jpeg", r2Prefix: "images" };
  }

  // WebP: RIFF....WEBP
  if (headStr.startsWith("RIFF") && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return { type: "image", ext: "webp", contentType: "image/webp", r2Prefix: "images" };
  }

  // GIF: GIF87a or GIF89a
  if (headStr.startsWith("GIF8")) {
    return { type: "image", ext: "gif", contentType: "image/gif", r2Prefix: "images" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Preview mode
// ---------------------------------------------------------------------------

async function runPreview() {
  console.log("Fetching RSS feed...");
  const resp = await fetch(RSS_FEED_URL);
  if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);
  const xml = await resp.text();
  const items = parseRSSItems(xml);
  console.log(`Found ${items.length} RSS items.\n`);

  const mappings = {};
  const summary = [];

  for (const item of items) {
    const url = extractSourceSheetUrl(item.description);
    if (!url) continue;
    if (shouldSkipUrl(url)) {
      summary.push({ title: item.title, url, action: "SKIP (rabbikraz.com)" });
      continue;
    }

    const isRebrandly = url.includes("rebrand.ly");
    summary.push({
      title: item.title,
      guid: item.guid,
      url,
      action: isRebrandly ? "NEEDS MAPPING" : "DIRECT",
    });

    if (isRebrandly) {
      mappings[url] = "";
    }
  }

  console.log("=== Source Sheet Summary ===\n");
  for (const s of summary) {
    console.log(`  [${s.action}] ${s.title}`);
    console.log(`           ${s.url}\n`);
  }

  const needsMapping = Object.keys(mappings).length;
  if (needsMapping > 0) {
    // Try to load existing mappings and preserve already-filled values
    let existing = {};
    try {
      existing = JSON.parse(readFileSync(MAPPINGS_FILE, "utf-8"));
    } catch {}

    for (const key of Object.keys(mappings)) {
      if (existing[key]) {
        mappings[key] = existing[key];
      }
    }

    writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2) + "\n");
    console.log(
      `\nWrote ${MAPPINGS_FILE} with ${needsMapping} rebrand.ly URLs.`
    );
    console.log(
      "Open each URL in a browser, copy the final Google Drive URL, and paste it as the value.\n"
    );
  } else {
    console.log("\nNo rebrand.ly URLs found — all URLs are direct.\n");
  }
}

// ---------------------------------------------------------------------------
// Execute mode
// ---------------------------------------------------------------------------

async function runExecute(env) {
  console.log(`Running in ${env} mode.\n`);

  // Load mappings
  let mappings = {};
  try {
    mappings = JSON.parse(readFileSync(MAPPINGS_FILE, "utf-8"));
  } catch {
    console.log("No pdf-mappings.json found — will only process direct URLs.");
  }

  // Check for unfilled mappings
  const unfilled = Object.entries(mappings).filter(([, v]) => !v);
  if (unfilled.length > 0) {
    console.warn(
      `Warning: ${unfilled.length} rebrand.ly URL(s) still have no mapping and will be skipped.\n`
    );
  }

  console.log("Fetching RSS feed...");
  const resp = await fetch(RSS_FEED_URL);
  if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);
  const xml = await resp.text();
  const items = parseRSSItems(xml);
  console.log(`Found ${items.length} RSS items.\n`);

  const tmpDir = mkdtempSync(join(tmpdir(), "sync-pdfs-"));
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  try {
    for (const item of items) {
      const sourceUrl = extractSourceSheetUrl(item.description);
      if (!sourceUrl || shouldSkipUrl(sourceUrl)) continue;

      console.log(`--- ${item.title} ---`);

      // 1. Look up shiur by GUID
      const rows = d1Execute(
        `SELECT id, slug, source_doc FROM shiurim WHERE guid = '${item.guid.replace(/'/g, "''")}'`,
        env
      );
      if (!rows || rows.length === 0) {
        console.log("  Shiur not found in DB, skipping.");
        skipped++;
        continue;
      }

      const shiur = rows[0];

      // 2. Skip if already has a real sourceDoc or source_documents entry
      if (shiur.source_doc && shiur.source_doc !== "null" && shiur.source_doc !== "") {
        console.log(`  Already has sourceDoc: ${shiur.source_doc}`);
        skipped++;
        continue;
      }

      const existingDocs = d1Execute(
        `SELECT COUNT(*) as cnt FROM source_documents WHERE shiur_id = '${shiur.id.replace(/'/g, "''")}'`,
        env
      );
      if (existingDocs && existingDocs[0]?.cnt > 0) {
        console.log(`  Already has ${existingDocs[0].cnt} source document(s).`);
        skipped++;
        continue;
      }

      // 3. Resolve URL
      let resolvedUrl = sourceUrl;
      if (sourceUrl.includes("rebrand.ly")) {
        resolvedUrl = mappings[sourceUrl];
        if (!resolvedUrl) {
          console.log("  No mapping for rebrand.ly URL, skipping.");
          skipped++;
          continue;
        }
      }

      // 4. Convert Google Drive share URL to direct download
      const downloadUrl = toGDriveDirectUrl(resolvedUrl);
      console.log(`  Downloading: ${downloadUrl}`);

      // 5. Download file
      let fileBuffer;
      try {
        const fileResp = await fetch(downloadUrl, { redirect: "follow" });
        if (!fileResp.ok) {
          throw new Error(`HTTP ${fileResp.status}`);
        }
        fileBuffer = Buffer.from(await fileResp.arrayBuffer());
      } catch (e) {
        console.error(`  Download failed: ${e.message}`);
        errors++;
        await sleep(DELAY_MS);
        continue;
      }

      // 6. Detect file type from magic bytes
      const fileInfo = detectFileType(fileBuffer);
      if (!fileInfo) {
        console.error(
          `  Unrecognized file type (first bytes: ${fileBuffer.slice(0, 20).toString("hex")})`
        );
        errors++;
        await sleep(DELAY_MS);
        continue;
      }

      console.log(`  Detected: ${fileInfo.type} (${fileInfo.contentType})`);

      // 7. Upload to R2
      const slug = (shiur.slug && shiur.slug !== "null") ? shiur.slug : sanitizeFilename(item.title);
      const sanitized = sanitizeFilename(slug);
      const timestamp = Date.now();
      const r2Key = `${fileInfo.r2Prefix}/${sanitized}-${timestamp}.${fileInfo.ext}`;
      const localPath = join(tmpDir, `${sanitized}-${timestamp}.${fileInfo.ext}`);
      writeFileSync(localPath, fileBuffer);

      console.log(`  Uploading to R2: ${r2Key}`);
      const uploaded = r2Upload(r2Key, localPath, env, fileInfo.contentType);
      if (!uploaded) {
        errors++;
        await sleep(DELAY_MS);
        continue;
      }

      // 8. Insert into source_documents table
      const docUrl = `/api/media/${r2Key}`;
      const docId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      const insertResult = d1Execute(
        `INSERT INTO source_documents (id, shiur_id, url, type, label, position, created_at) VALUES ('${docId}', '${shiur.id.replace(/'/g, "''")}', '${docUrl}', '${fileInfo.type}', NULL, 0, ${now})`,
        env
      );
      if (insertResult === null) {
        errors++;
      } else {
        console.log(`  Added source document: ${docUrl} (${fileInfo.type})`);
        processed++;
      }

      await sleep(DELAY_MS);
    }
  } finally {
    // Clean up temp directory
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`\n=== Done ===`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Errors:    ${errors}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.includes("--preview")) {
  runPreview().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (args.includes("--local")) {
  runExecute("local").catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (args.includes("--remote")) {
  runExecute("remote").catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.log(`Usage:
  node scripts/sync-pdfs.mjs --preview   Generate pdf-mappings.json with rebrand.ly URLs to resolve
  node scripts/sync-pdfs.mjs --local     Execute against local D1/R2
  node scripts/sync-pdfs.mjs --remote    Execute against production D1/R2
`);
}
