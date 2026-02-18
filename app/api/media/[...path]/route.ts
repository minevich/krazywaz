import { NextRequest, NextResponse } from "next/server";
import { getR2Bucket } from "@/lib/db";

/**
 * Serve files from R2 bucket via a proxy route.
 * Handles paths like /api/media/audio/my-file.mp3 or /api/media/pdfs/source.pdf
 *
 * This allows serving R2 content without enabling full public access on the bucket,
 * and gives us control over caching headers, auth, etc.
 *
 * NOTE: We read the full R2 body into an ArrayBuffer before responding.
 * Passing the R2 ReadableStream directly to NextResponse causes connection errors
 * (PR_END_OF_FILE_ERROR) in the wrangler dev environment because the stream types
 * are not fully compatible. Reading into ArrayBuffer is reliable across all environments.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const key = path.join("/");

    if (!key) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    // Prevent directory traversal
    if (key.includes("..") || key.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const bucket = await getR2Bucket();
    if (!bucket) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    const object = await bucket.get(key);

    if (!object) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read the entire R2 body into an ArrayBuffer for reliable delivery
    const arrayBuffer = await object.arrayBuffer();

    const headers = new Headers();

    // Set content type from R2 metadata or infer from extension
    const contentType =
      object.httpMetadata?.contentType || inferContentType(key);
    headers.set("Content-Type", contentType);

    // Cache for 1 year (files are immutable due to timestamp in key)
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    // Allow CORS for media playback from other origins
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range");
    headers.set("Accept-Ranges", "bytes");

    // Support range requests for audio/video streaming
    const range = request.headers.get("range");
    if (range && object.size) {
      const matches = range.match(/bytes=(\d+)-(\d*)/);
      if (matches) {
        const start = parseInt(matches[1], 10);
        const end = matches[2] ? parseInt(matches[2], 10) : object.size - 1;

        if (start >= object.size) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${object.size}`,
            },
          });
        }

        const clampedEnd = Math.min(end, object.size - 1);
        const contentLength = clampedEnd - start + 1;

        headers.set(
          "Content-Range",
          `bytes ${start}-${clampedEnd}/${object.size}`,
        );
        headers.set("Content-Length", String(contentLength));

        const sliced = arrayBuffer.slice(start, clampedEnd + 1);

        return new NextResponse(sliced, {
          status: 206,
          headers,
        });
      }
    }

    // Full response
    headers.set("Content-Length", String(arrayBuffer.byteLength));

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Media serve error:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 },
    );
  }
}

/**
 * Handle HEAD requests for content info without downloading
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const key = path.join("/");

    if (!key || key.includes("..") || key.startsWith("/")) {
      return new NextResponse(null, { status: 400 });
    }

    const bucket = await getR2Bucket();
    if (!bucket) {
      return new NextResponse(null, { status: 500 });
    }

    const object = await bucket.head(key);

    if (!object) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = new Headers();
    const contentType =
      object.httpMetadata?.contentType || inferContentType(key);
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", String(object.size));
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(null, { status: 200, headers });
  } catch (error) {
    console.error("Media HEAD error:", error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * Handle CORS preflight for media requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function inferContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return types[ext || ""] || "application/octet-stream";
}
