# 📦 TypeScript File Server & CDN

> A full-stack media upload and delivery system built with TypeScript and Bun — featuring local file storage, AWS S3 integration, CloudFront CDN delivery, and FFMPEG-powered video processing.

---

## What is this?

Tubely is a YouTube-like backend for uploading, storing, and serving video and image content. Files are uploaded through a REST API, processed server-side with FFMPEG, stored in AWS S3, and delivered globally via CloudFront CDN.

This project is where I learned how real media platforms handle file storage — the difference between serving files directly from your server (slow, doesn't scale) vs. offloading to object storage and a CDN (fast, scales infinitely).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Bun |
| Database | SQLite (via better-sqlite3) |
| File storage | AWS S3 |
| CDN | AWS CloudFront |
| Media processing | FFMPEG + ffprobe |
| Frontend | HTML / CSS / JS |

---

## Features

- **File upload API** — accepts images and videos via multipart form data
- **Local asset storage** — files served from `/assets` during development
- **S3 integration** — production uploads go directly to an S3 bucket
- **CloudFront delivery** — media served through CDN for low-latency global access
- **FFMPEG video processing** — server-side video validation, metadata extraction, and aspect ratio detection
- **SQLite database** — lightweight persistence for file metadata
- **Sample media downloader** — `samplesdownload.sh` for quick local testing

---

## Architecture

```
Client (upload)
    │
    ▼
Express API (Bun runtime)
    ├── Validate file type & size
    ├── Process with FFMPEG (video metadata, aspect ratio)
    ├── Store locally (dev) OR upload to S3 (prod)
    └── Save metadata to SQLite
          │
          ▼
    CloudFront CDN ← S3 Bucket
          │
          ▼
    Client (fast delivery anywhere)
```

---

## Getting Started

**Prerequisites:** Bun, FFMPEG, AWS CLI, SQLite 3

```bash
# Clone the repo
git clone https://github.com/VladV1999/TypeScript-file-server-CDN
cd TypeScript-file-server-CDN

# Install dependencies
bun install

# Download sample media for testing
./samplesdownload.sh

# Configure environment
cp .env.example .env
# Add your AWS credentials, S3 bucket name, CloudFront URL

# Start the server
bun run src/index.ts
```

Open the link printed in your console to access the local UI.

---

## What I Learned

- The architectural difference between local file serving and CDN-backed delivery — and why it matters at scale
- How S3 presigned URLs work and when to use them vs. public bucket access
- CloudFront distribution configuration: origins, cache behaviors, and invalidation
- FFMPEG as a programmable tool — calling it from TypeScript to extract video metadata and enforce constraints
- Why SQLite is actually a solid choice for single-server applications with modest write loads

---

## What's Next

- [ ] Video transcoding to multiple resolutions (360p, 720p, 1080p)
- [ ] Upload progress tracking via WebSockets
- [ ] User authentication and private media support
- [ ] Presigned URL uploads (bypass server for large files)

Built as part of the Boot.dev backend cirriculum