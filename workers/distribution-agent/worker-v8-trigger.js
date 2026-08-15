import baseWorker, { WordPressAuthState as BaseWordPressAuthState } from "./worker-v8-hatena.js";

const QUEUE_API = "https://api.github.com/repos/lifetolife-net/lifetolife-net.github.io/contents/distribution/queue?ref=main";
const QUEUE_ORIGIN = "https://raw.githubusercontent.com";
const UA = "LifeToLife-Distribution-Trigger/1.0 (+https://lifetolife.net)";
const AUTO_TARGETS = new Set([
  "facebook",
  "instagram",
  "threads",
  "bluesky",
  "blogger",
  "wordpress",
  "tumblr",
  "youtube",
]);
const MAX_JOBS_PER_RUN = 10;
const CLAIM_TTL_MS = 20 * 60 * 1000;
const MAX_ATTEMPTS = 5;

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
  return String(value);
}

function authorize(request, env) {
  return (request.headers.get("authorization") || "") === `Bearer ${requiredEnv(env, "DISTRIBUTION_AGENT_KEY")}`;
}

function publicError(error) {
  return { message: error?.message || String(error) };
}

function stateStub(env) {
  if (!env.WPCOM_AUTH_STATE) throw new Error("WPCOM_AUTH_STATE Durable Object binding is not configured");
  return env.WPCOM_AUTH_STATE.getByName("distribution-trigger");
}

function stateKey(jobId, target) {
  return `distribution-target:${jobId}:${target}`;
}

export class WordPressAuthState extends BaseWordPressAuthState {
  async claimDistributionTarget({ job_id, target, job_sha }) {
    const key = stateKey(String(job_id), String(target));
    const now = Date.now();
    const current = await this.ctx.storage.get(key);

    // A completed job_id + target is immutable. Editing the queue file must not
    // silently republish it; intentional republication requires a new job_id.
    if (current?.status === "completed") {
      return { claimed: false, reason: "completed", state: current };
    }

    if (
      current?.job_sha === job_sha &&
      current?.status === "in_flight" &&
      Number(current.started_at || 0) + CLAIM_TTL_MS > now
    ) {
      return { claimed: false, reason: "in_flight", state: current };
    }

    const previousAttempts = current?.job_sha === job_sha ? Number(current.attempts || 0) : 0;
    if (previousAttempts >= MAX_ATTEMPTS) {
      return { claimed: false, reason: "max_attempts", state: current };
    }

    const next = {
      job_id: String(job_id),
      target: String(target),
      job_sha: String(job_sha),
      status: "in_flight",
      attempts: previousAttempts + 1,
      started_at: now,
      updated_at: now,
    };
    await this.ctx.storage.put(key, next);
    return { claimed: true, state: next };
  }

  async completeDistributionTarget({ job_id, target, job_sha, result }) {
    const key = stateKey(String(job_id), String(target));
    const current = (await this.ctx.storage.get(key)) || {};
    const now = Date.now();
    const safeResult = {
      id: result?.id === undefined || result?.id === null ? null : String(result.id),
      permalink: result?.permalink || null,
      mode: result?.mode || null,
    };
    const next = {
      ...current,
      job_id: String(job_id),
      target: String(target),
      job_sha: String(job_sha),
      status: "completed",
      completed_at: now,
      updated_at: now,
      result: safeResult,
    };
    await this.ctx.storage.put(key, next);
    return next;
  }

  async failDistributionTarget({ job_id, target, job_sha, error }) {
    const key = stateKey(String(job_id), String(target));
    const current = (await this.ctx.storage.get(key)) || {};
    const now = Date.now();
    const next = {
      ...current,
      job_id: String(job_id),
      target: String(target),
      job_sha: String(job_sha),
      status: "failed",
      failed_at: now,
      updated_at: now,
      error: String(error || "unknown error").slice(0, 1000),
    };
    await this.ctx.storage.put(key, next);
    return next;
  }

  async inspectDistributionJob({ job_id }) {
    const prefix = `distribution-target:${String(job_id)}:`;
    const rows = await this.ctx.storage.list({ prefix });
    const targets = {};
    for (const [key, value] of rows.entries()) {
      targets[key.slice(prefix.length)] = value;
    }
    return { job_id: String(job_id), targets };
  }
}

async function githubJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "user-agent": UA,
    },
  });
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`GitHub queue request failed with HTTP ${response.status}`);
  return payload;
}

async function listQueue() {
  const payload = await githubJson(QUEUE_API);
  if (!payload) return [];
  if (!Array.isArray(payload)) throw new Error("GitHub queue path is not a directory");
  return payload
    .filter(item => item?.type === "file" && String(item.name || "").endsWith(".json"))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .slice(0, MAX_JOBS_PER_RUN);
}

function safeRawGithubUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.origin !== QUEUE_ORIGIN) {
    throw new Error("Queue job download URL must use raw.githubusercontent.com over HTTPS");
  }
  return parsed.toString();
}

async function fetchJob(item) {
  if (!item?.download_url) throw new Error(`Queue item ${item?.name || "unknown"} has no download_url`);
  const response = await fetch(safeRawGithubUrl(item.download_url), {
    headers: { "user-agent": UA, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Queue job ${item.name} fetch failed with HTTP ${response.status}`);
  let job;
  try {
    job = JSON.parse(text);
  } catch {
    throw new Error(`Queue job ${item.name} is not valid JSON`);
  }
  return { job, sha: String(item.sha || ""), name: String(item.name || "") };
}

function validateJob(job, name) {
  if (job?.schema !== "lifetolife.distribution-job.v1") return { runnable: false, reason: "schema" };
  if (job?.status !== "ready") return { runnable: false, reason: "status" };
  if (job?.approval !== "publish") return { runnable: false, reason: "approval" };
  const jobId = String(job?.job_id || "").trim();
  if (!jobId) throw new Error(`Queue job ${name} is missing job_id`);

  const now = Date.now();
  if (job.not_before && Date.parse(job.not_before) > now) return { runnable: false, reason: "not_before", job_id: jobId };
  if (job.expires_at && Date.parse(job.expires_at) <= now) return { runnable: false, reason: "expired", job_id: jobId };

  const rawPackages = job.auto_publish && typeof job.auto_publish === "object" ? job.auto_publish : {};
  const packages = {};
  for (const [rawTarget, pkg] of Object.entries(rawPackages)) packages[String(rawTarget).toLowerCase()] = pkg;
  const targets = Object.keys(packages);
  const invalid = targets.filter(target => !AUTO_TARGETS.has(target));
  if (invalid.length) throw new Error(`Queue job ${name} has unsupported auto target(s): ${invalid.join(", ")}`);

  return { runnable: true, job_id: jobId, packages, targets };
}

function internalJsonRequest(env, body) {
  return new Request("https://distribution-api.lifetolife.net/v1/publish", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv(env, "DISTRIBUTION_AGENT_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function normalizeHttpsUrl(value, field) {
  const parsed = new URL(String(value || ""));
  if (parsed.protocol !== "https:") throw new Error(`${field} must use HTTPS`);
  return parsed.toString();
}

async function publishJsonPackage(env, ctx, target, pkg, idempotencyKey) {
  const body = pkg?.body && typeof pkg.body === "object" ? { ...pkg.body } : { ...pkg };
  delete body.type;
  delete body.body;
  body.targets = [target];
  if (!body.idempotency_key) body.idempotency_key = idempotencyKey;

  const response = await baseWorker.fetch(internalJsonRequest(env, body), env, ctx);
  const payload = await response.json().catch(() => ({}));
  const result = payload?.results?.[target];
  if (!response.ok || result?.ok !== true) {
    const message = result?.error?.message || payload?.error?.message || payload?.error || `HTTP ${response.status}`;
    throw new Error(`${target} publish failed: ${message}`);
  }
  return result;
}

async function publishYouTubePackage(env, ctx, pkg) {
  const videoUrl = normalizeHttpsUrl(pkg?.video_url, "youtube.video_url");
  const title = String(pkg?.title || "").trim();
  if (!title) throw new Error("youtube.title is required");
  const description = String(pkg?.description || "");
  const privacyStatus = String(pkg?.privacy_status || "private").toLowerCase();
  if (!["private", "unlisted", "public"].includes(privacyStatus)) {
    throw new Error("youtube.privacy_status must be private, unlisted, or public");
  }

  const mediaResponse = await fetch(videoUrl, { headers: { "user-agent": UA } });
  if (!mediaResponse.ok) throw new Error(`YouTube media fetch failed with HTTP ${mediaResponse.status}`);
  const contentType = mediaResponse.headers.get("content-type") || "video/mp4";
  if (!contentType.startsWith("video/")) throw new Error(`YouTube media URL returned non-video content-type: ${contentType}`);
  const blob = await mediaResponse.blob();
  if (!blob.size) throw new Error("YouTube media URL returned an empty file");

  const form = new FormData();
  form.append("video", blob, String(pkg?.filename || "lifetolife-video.mp4"));
  form.append("title", title);
  form.append("description", description);
  form.append("privacy_status", privacyStatus);

  const request = new Request("https://distribution-api.lifetolife.net/v1/publish/youtube", {
    method: "POST",
    headers: { Authorization: `Bearer ${requiredEnv(env, "DISTRIBUTION_AGENT_KEY")}` },
    body: form,
  });
  const response = await baseWorker.fetch(request, env, ctx);
  const payload = await response.json().catch(() => ({}));
  const result = payload?.results?.youtube;
  if (!response.ok || result?.ok !== true) {
    const message = result?.error?.message || payload?.error?.message || payload?.error || `HTTP ${response.status}`;
    throw new Error(`youtube publish failed: ${message}`);
  }
  return result;
}

async function publishPackage(env, ctx, target, pkg, jobId, jobSha) {
  const type = String(pkg?.type || (target === "youtube" ? "youtube_video" : "json"));
  if (target === "youtube") {
    if (type !== "youtube_video") throw new Error("YouTube package type must be youtube_video");
    return publishYouTubePackage(env, ctx, pkg);
  }
  if (type !== "json") throw new Error(`${target} package type must be json`);
  return publishJsonPackage(env, ctx, target, pkg, `${jobId}:${target}:${jobSha}`);
}

async function processJob(env, ctx, item) {
  const loaded = await fetchJob(item);
  const check = validateJob(loaded.job, loaded.name);
  if (!check.runnable) {
    return { name: loaded.name, job_id: check.job_id || null, skipped: true, reason: check.reason };
  }

  const stub = stateStub(env);
  const results = {};
  for (const target of check.targets) {
    const claim = await stub.claimDistributionTarget({
      job_id: check.job_id,
      target,
      job_sha: loaded.sha,
    });

    if (!claim?.claimed) {
      results[target] = {
        ok: claim?.reason === "completed",
        skipped: true,
        reason: claim?.reason || "not_claimed",
        state: claim?.state || null,
      };
      continue;
    }

    try {
      const result = await publishPackage(env, ctx, target, check.packages[target], check.job_id, loaded.sha);
      await stub.completeDistributionTarget({
        job_id: check.job_id,
        target,
        job_sha: loaded.sha,
        result,
      });
      results[target] = { ok: true, id: result?.id || null, permalink: result?.permalink || null };
    } catch (error) {
      await stub.failDistributionTarget({
        job_id: check.job_id,
        target,
        job_sha: loaded.sha,
        error: error?.message || String(error),
      });
      results[target] = { ok: false, error: publicError(error) };
    }
  }

  const allAutoComplete = check.targets.every(target => results[target]?.ok === true);
  return {
    name: loaded.name,
    job_id: check.job_id,
    job_sha: loaded.sha,
    all_auto_complete: allAutoComplete,
    results,
    assisted_manual_available: Object.keys(
      loaded.job.assisted_manual && typeof loaded.job.assisted_manual === "object" ? loaded.job.assisted_manual : {}
    ),
  };
}

async function runQueue(env, ctx, reason = "manual") {
  const items = await listQueue();
  const jobs = [];
  for (const item of items) {
    try {
      jobs.push(await processJob(env, ctx, item));
    } catch (error) {
      jobs.push({ name: item?.name || null, ok: false, error: publicError(error) });
    }
  }
  return {
    ok: jobs.every(job => job?.ok !== false && job?.all_auto_complete !== false),
    trigger: reason,
    queue_count: items.length,
    processed_at: new Date().toISOString(),
    jobs,
  };
}

async function handleTriggerStatus(request, env) {
  const url = new URL(request.url);
  const jobId = String(url.searchParams.get("job_id") || "").trim();
  if (!jobId) return json({ ok: false, error: "job_id query parameter is required" }, 400);
  const status = await stateStub(env).inspectDistributionJob({ job_id: jobId });
  return json({ ok: true, ...status, secret_values_returned: false });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

    if (path === "/v1/trigger/run" && request.method === "POST") {
      if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
      try {
        return json(await runQueue(env, ctx, "manual"));
      } catch (error) {
        return json({ ok: false, error: publicError(error) }, 502);
      }
    }

    if (path === "/v1/trigger/status" && request.method === "GET") {
      if (!authorize(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
      try {
        return await handleTriggerStatus(request, env);
      } catch (error) {
        return json({ ok: false, error: publicError(error) }, 502);
      }
    }

    if (path === "/health") {
      const response = await baseWorker.fetch(request, env, ctx);
      const payload = await response.json().catch(() => ({}));
      return json({
        ...payload,
        distribution_trigger: "github-queue-cron-v1",
        distribution_trigger_schedule: "*/5 * * * * (UTC)",
        distribution_queue: "lifetolife-net/lifetolife-net.github.io:distribution/queue/*.json",
        auto_targets: [...AUTO_TARGETS],
        trigger_run_route: "/v1/trigger/run",
        trigger_status_route: "/v1/trigger/status?job_id=...",
      }, response.status);
    }

    return baseWorker.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runQueue(env, ctx, `cron:${controller.cron}`));
  },
};
