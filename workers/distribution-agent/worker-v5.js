import baseWorker from "./worker-v4.js";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function providerError(provider, response, payload, fallback) {
  const err = new Error(
    payload?.error?.message ||
      payload?.error_description ||
      payload?.message ||
      (typeof payload?.error === "string" ? payload.error : null) ||
      fallback ||
      `${provider} request failed with HTTP ${response.status}`
  );
  err.status = response.status;
  err.provider = provider;
  err.providerPayload = payload;
  return err;
}

function publicError(error) {
  const payload = error?.providerPayload;
  return {
    message: error?.message || String(error),
    provider: error?.provider || undefined,
    details: payload
      ? {
          error:
            typeof payload.error === "string"
              ? payload.error
              : payload.error?.type || payload.error?.code || undefined,
          code: payload.error?.code || undefined,
          message:
            payload.error?.message || payload.error_description || payload.message || undefined,
        }
      : undefined,
  };
}

function authorize(request, env) {
  const expected = requiredEnv(env, "DISTRIBUTION_AGENT_KEY");
  return (request.headers.get("authorization") || "") === `Bearer ${expected}`;
}

async function getYouTubeAccessToken(env) {
  const params = new URLSearchParams({
    client_id: requiredEnv(env, "YOUTUBE_CLIENT_ID"),
    refresh_token: requiredEnv(env, "YOUTUBE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  if (env.YOUTUBE_CLIENT_SECRET) params.set("client_secret", env.YOUTUBE_CLIENT_SECRET);

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const payload = await readJsonResponse(response);
  if (!response.ok || payload?.error || !payload.access_token) {
    throw providerError("google-oauth-youtube", response, payload, "YouTube OAuth refresh failed");
  }
  return payload.access_token;
}

async function youtubeListVideo(accessToken, videoId) {
  const url = new URL(`${YOUTUBE_API}/videos`);
  url.searchParams.set("part", "snippet,status,processingDetails");
  url.searchParams.set("id", videoId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await readJsonResponse(response);
  if (!response.ok || payload?.error) {
    throw providerError("youtube", response, payload, "YouTube videos.list failed");
  }
  return Array.isArray(payload.items) && payload.items.length ? payload.items[0] : null;
}

async function waitForYouTubeProcessing(accessToken, videoId, { attempts = 20, intervalMs = 3000 } = {}) {
  let last = null;
  let missingAttempts = 0;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await youtubeListVideo(accessToken, videoId);

    // YouTube can return the new ID from videos.insert before videos.list has
    // propagated the resource to the read path. Treat an empty items array as
    // transient during the polling window rather than an immediate failure.
    if (!last) {
      missingAttempts += 1;
      if (attempt < attempts) {
        await sleep(intervalMs);
        continue;
      }
      break;
    }

    const uploadStatus = last.status?.uploadStatus || null;
    const processingStatus = last.processingDetails?.processingStatus || null;

    if (uploadStatus === "processed" && processingStatus === "succeeded") {
      return { video: last, attempts: attempt, missing_attempts: missingAttempts, completed: true };
    }

    if (
      uploadStatus === "failed" ||
      uploadStatus === "rejected" ||
      processingStatus === "failed" ||
      processingStatus === "terminated"
    ) {
      const reason = last.processingDetails?.processingFailureReason || null;
      throw new Error(
        `YouTube processing entered terminal failure: upload=${uploadStatus}, processing=${processingStatus}, reason=${reason}`
      );
    }

    if (attempt < attempts) await sleep(intervalMs);
  }

  if (!last) {
    throw new Error(
      `YouTube video ${videoId} was still not retrievable after ${attempts} videos.list attempts (${missingAttempts} empty reads)`
    );
  }

  return { video: last, attempts, missing_attempts: missingAttempts, completed: false };
}

function verificationSummary(result) {
  const video = result.video;
  return {
    id: video.id,
    title: video.snippet?.title || null,
    privacy_status: video.status?.privacyStatus || null,
    upload_status: video.status?.uploadStatus || null,
    processing_status: video.processingDetails?.processingStatus || null,
    processing_failure_reason: video.processingDetails?.processingFailureReason || null,
    poll_attempts: result.attempts,
    empty_read_attempts: result.missing_attempts,
    processing_completed: result.completed,
  };
}

async function publishYouTube(env, { video, title, description, privacyStatus }) {
  if (!video || typeof video.size !== "number" || video.size <= 0) throw new Error("video file is required");
  if (!String(video.type || "").startsWith("video/")) throw new Error("video must use a video/* MIME type");

  const accessToken = await getYouTubeAccessToken(env);
  const metadata = {
    snippet: {
      title: title || "LifeToLife Distribution Agent test",
      description: description || "",
      categoryId: "22",
    },
    status: { privacyStatus: privacyStatus || "private" },
  };

  const initUrl = new URL(YOUTUBE_UPLOAD);
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");

  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(video.size),
      "x-upload-content-type": video.type || "video/mp4",
    },
    body: JSON.stringify(metadata),
  });
  const initPayload = await readJsonResponse(initResponse);
  if (!initResponse.ok) {
    throw providerError("youtube", initResponse, initPayload, "YouTube resumable upload initialization failed");
  }
  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube resumable upload initialization returned no Location header");

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": video.type || "video/mp4",
      "content-length": String(video.size),
    },
    body: video,
  });
  const uploaded = await readJsonResponse(uploadResponse);
  if (!uploadResponse.ok) {
    throw providerError("youtube", uploadResponse, uploaded, "YouTube video upload failed");
  }
  const videoId = uploaded.id;
  if (!videoId) throw new Error("YouTube upload returned no video ID");

  const polled = await waitForYouTubeProcessing(accessToken, videoId);
  return {
    ok: true,
    target: "youtube",
    mode: "verified-resumable-private-upload-v5",
    id: videoId,
    permalink: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    upload_http_status: uploadResponse.status,
    verification: verificationSummary(polled),
  };
}

async function handleYouTubePublish(request, env) {
  const form = await request.formData();
  const video = form.get("video");
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const privacyStatus = String(form.get("privacy_status") || "private").trim().toLowerCase();

  if (!video || typeof video.size !== "number") {
    return json({ ok: false, error: "multipart field 'video' is required" }, 400);
  }
  if (!title) return json({ ok: false, error: "multipart field 'title' is required" }, 400);
  if (!new Set(["private", "unlisted", "public"]).has(privacyStatus)) {
    return json({ ok: false, error: "privacy_status must be private, unlisted, or public" }, 400);
  }

  try {
    const result = await publishYouTube(env, { video, title, description, privacyStatus });
    return json({
      ok: true,
      results: { youtube: result },
      request: {
        title,
        description,
        privacy_status: privacyStatus,
        size: video.size,
        mime_type: video.type || null,
      },
    });
  } catch (error) {
    return json(
      { ok: false, results: { youtube: { ok: false, target: "youtube", error: publicError(error) } } },
      207
    );
  }
}

async function handleYouTubeVerify(request, env) {
  const body = await request.json().catch(() => null);
  const videoId = String(body?.video_id || "").trim();
  if (!videoId) return json({ ok: false, error: "video_id is required" }, 400);

  try {
    const accessToken = await getYouTubeAccessToken(env);
    const polled = await waitForYouTubeProcessing(accessToken, videoId, { attempts: 20, intervalMs: 3000 });
    return json({
      ok: true,
      results: {
        youtube: {
          ok: true,
          target: "youtube",
          mode: "verification-only-v5",
          id: videoId,
          permalink: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
          verification: verificationSummary(polled),
        },
      },
    });
  } catch (error) {
    return json(
      { ok: false, results: { youtube: { ok: false, target: "youtube", error: publicError(error) } } },
      207
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") {
      return json({
        ok: true,
        service: "lifetolife-distribution-agent",
        mode: "verified-path-v5",
        targets: ["facebook", "instagram", "threads", "bluesky", "blogger", "wordpress", "youtube"],
        youtube_upload_route: "/v1/publish/youtube",
        youtube_verify_route: "/v1/verify/youtube",
        wordpress_token_state_bound: Boolean(env.TOKEN_STATE),
      });
    }

    if (path === "/v1/publish/youtube" || path === "/v1/verify/youtube") {
      if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      if (path === "/v1/publish/youtube") return handleYouTubePublish(request, env);
      return handleYouTubeVerify(request, env);
    }

    return baseWorker.fetch(request, env, ctx);
  },
};
