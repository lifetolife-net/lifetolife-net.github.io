import baseWorker, { WordPressAuthState } from "./worker-v8-trigger.js";

export { WordPressAuthState };

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return String(value);
}

function jsonResponse(payload, response) {
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.delete("content-length");
  return new Response(JSON.stringify(payload, null, 2), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function getYouTubeAccessToken(env) {
  const params = new URLSearchParams({
    client_id: requiredEnv(env, "YOUTUBE_CLIENT_ID"),
    refresh_token: requiredEnv(env, "YOUTUBE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  if (env.YOUTUBE_CLIENT_SECRET) params.set("client_secret", String(env.YOUTUBE_CLIENT_SECRET));

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const payload = await readJsonResponse(response);
  if (!response.ok || payload?.error || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.error?.message ||
        (typeof payload?.error === "string" ? payload.error : null) ||
        `YouTube OAuth refresh failed with HTTP ${response.status}`
    );
  }
  return String(payload.access_token);
}

async function readYouTubeRestrictionState(env, videoId) {
  const accessToken = await getYouTubeAccessToken(env);
  const url = new URL(`${YOUTUBE_API}/videos`);
  url.searchParams.set("part", "snippet,status,contentDetails");
  url.searchParams.set("id", videoId);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await readJsonResponse(response);
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message || `YouTube videos.list failed with HTTP ${response.status}`);
  }

  const video = Array.isArray(payload.items) && payload.items.length ? payload.items[0] : null;
  if (!video) throw new Error(`YouTube video ${videoId} was not returned by restriction inspection`);
  return video;
}

function restrictionSummary(video) {
  const status = video.status || {};
  const details = video.contentDetails || {};
  const region = details.regionRestriction || null;
  const contentRating = details.contentRating || {};
  const ytRating = contentRating.ytRating || null;
  const ageRestricted = ytRating === "ytAgeRestricted";
  const regionRestricted = Boolean(
    region &&
      ((Array.isArray(region.allowed) && region.allowed.length > 0) ||
        (Array.isArray(region.blocked) && region.blocked.length > 0))
  );

  return {
    contains_synthetic_media:
      typeof status.containsSyntheticMedia === "boolean" ? status.containsSyntheticMedia : null,
    duration: details.duration || null,
    dimension: details.dimension || null,
    definition: details.definition || null,
    caption: details.caption || null,
    age_restricted: ageRestricted,
    yt_rating: ytRating,
    region_restricted: regionRestricted,
    region_allowed: Array.isArray(region?.allowed) ? region.allowed : null,
    region_blocked: Array.isArray(region?.blocked) ? region.blocked : null,
    made_for_kids: typeof status.madeForKids === "boolean" ? status.madeForKids : null,
    self_declared_made_for_kids:
      typeof status.selfDeclaredMadeForKids === "boolean" ? status.selfDeclaredMadeForKids : null,
    embeddable: typeof status.embeddable === "boolean" ? status.embeddable : null,
    license: status.license || null,
    licensed_content: typeof details.licensedContent === "boolean" ? details.licensedContent : null,
    upload_failure_reason: status.failureReason || null,
    upload_rejection_reason: status.rejectionReason || null,
    hard_distribution_restriction_detected: Boolean(
      ageRestricted || regionRestricted || status.uploadStatus === "failed" || status.uploadStatus === "rejected"
    ),
  };
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const inspectYouTube = path === "/v1/verify/youtube" && request.method === "POST";
    const requestCopy = inspectYouTube ? request.clone() : null;

    const response = await baseWorker.fetch(request, env, ctx);
    if (!inspectYouTube) return response;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return response;

    const payload = await response.clone().json().catch(() => null);
    if (!payload || payload?.results?.youtube?.ok !== true) return response;

    const body = await requestCopy.json().catch(() => null);
    const videoId = String(body?.video_id || "").trim();
    if (!videoId) return response;

    try {
      const video = await readYouTubeRestrictionState(env, videoId);
      const verification = payload.results.youtube.verification || {};
      Object.assign(verification, restrictionSummary(video));
      verification.restriction_inspection_completed = true;
      payload.results.youtube.verification = verification;
      payload.results.youtube.mode = "verification-plus-restriction-inspection-v1";
      return jsonResponse(payload, response);
    } catch (error) {
      const verification = payload.results.youtube.verification || {};
      verification.restriction_inspection_completed = false;
      verification.restriction_inspection_error = error?.message || String(error);
      payload.results.youtube.verification = verification;
      return jsonResponse(payload, response);
    }
  },

  async scheduled(controller, env, ctx) {
    if (typeof baseWorker.scheduled === "function") {
      return baseWorker.scheduled(controller, env, ctx);
    }
  },
};
