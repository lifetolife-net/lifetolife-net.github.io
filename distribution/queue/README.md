# LifeToLife Distribution Queue

This directory is polled by the Cloudflare Distribution Agent trigger every 5 minutes.

Only `*.json` files are considered, and a job is runnable only when all of the following are true:

- `schema` is `lifetolife.distribution-job.v1`
- `status` is `ready`
- `approval` is `publish`
- `job_id` is non-empty

A completed `job_id + target` is immutable in Durable Object state. Editing a completed queue file does **not** republish it. Intentional republication requires a new `job_id`.

Never place secrets, passwords, tokens, API keys, cookies, or private credentials in queue files.

The queue file must contain platform-native packages. Do not place one generic post into every target. ChatGPT/Distribution Agent preparation should create each target's native wording/assets first, then commit the approved job here.

See `distribution/JOB_SCHEMA.md` and `distribution/examples/job-v1.example.json`.
