# Reviewed content imports for Movion

`scripts/import-movion-content.mjs` is an operator command for a small, reviewed first batch of voiced Shorts and long videos. It uses the existing `videos`, `video_qualities`, approved channels and public `videos` storage bucket. It requires no frontend, recommendation, realtime, schema or package changes. It does not run automatically when the website builds.

**Status:** implemented and covered by offline integration tests. No licensed content batch has been published with this tool yet. There is no connected source subscription, voice-generation service, automatic discovery job or million-video inventory. Production playback still needs a first authorized, reviewed batch and an authenticated browser check.

## Choosing a source

The suitable route is a reviewed open-license catalog plus original/creator-authorized productions. Free API access is not permission to redistribute every result. “CC licensed” also does not mean copyright has disappeared.

| Source | Suitable use | Boundary |
| --- | --- | --- |
| Wikimedia Commons | Review each file's CC0 or CC BY license, creator, source and complete soundtrack rights. | Search results can be silent, historical or mislabeled; metadata does not replace review. API limits apply. |
| Blender open films | A small starter catalog of openly licensed films; select voiced titles such as Sintel or Tears of Steel and retain required credits. | A small catalog, not millions or a current trending feed. Check the particular release and soundtrack. |
| Original Hindi/Urdu productions | Original scripts, properly licensed footage, narration and music can build a relevant catalog over time. | Voice/rendering services and streaming may cost money. A stock footage license must permit the finished use. |
| Direct creator agreements | Obtain permission covering commercial streaming, redistribution, audio and intended territories. | Custom licenses require a separate reviewed integration; this initial command only accepts the explicit CC licenses below. |

Pexels currently restricts standalone redistribution and unauthorized bulk copying. Pixabay's API documentation prohibits systematic mass downloads. Do not point a bulk scraper at either service. YouTube/TikTok download or rehosting rights must not be assumed from public availability; official embedded playback would require separate player integration.

Primary sources checked on 2026-09-16:

- [Pexels terms, sections 5 and 8](https://www.pexels.com/terms-of-service/)
- [Pixabay API rate and download rules](https://pixabay.com/api/docs/)
- [Wikimedia reuse and attribution guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
- [Sintel sharing/license information](https://durian.blender.org/sharing/)
- [Tears of Steel licensing and credits](https://mango.blender.org/about/)
- [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
- [Supabase standard upload guidance](https://supabase.com/docs/guides/storage/uploads/standard-uploads)

## What the tool validates

- The manifest explicitly records review of the complete work, including speech, music and other audio. Allowed licenses are `CC0-1.0`, `CC-BY-3.0`, and `CC-BY-4.0`. Unknown, NC, ND, SA and custom licenses are outside this pilot's supported license policy.
- Files must already exist locally. There is no external-media downloader or hotlinking. H.264/yuv420p MP4 plus AAC audio is required. Duration and dimensions come from ffprobe, not guessed metadata. Pilot Shorts must be portrait or square, at most 180 seconds; long videos may be up to two hours. The source file is not trimmed, cropped, dubbed or re-encoded.
- An AAC track proves an audio stream exists, **not** that it contains speech or cleared music. `spokenAudioConfirmed` and `fullVideoAndAudioRights` are human review attestations. They must not be auto-filled from provider search metadata. The command does not perform speech recognition or determine legal rights.
- CC BY Shorts require attribution in the media itself because the current Shorts screen does not show full descriptions. Preserve all applicable credit, source, license and change notices when preparing the file. The importer preserves that file byte-for-byte. Long-video attribution is also written to the existing description field. Preserve source end credits when required.
- The entire batch passes metadata checks, a complete video/audio decode and thumbnail generation before any upload. A decode has a five-minute processing timeout per file; preparation fails closed if it cannot finish. Dry-run is the default and makes no network requests. A temporary thumbnail directory is removed on completion or error; existing files and repository folders are not copied.
- Publishing authenticates the actual channel owner and requires an approved video channel. It uses the normal user's access token and existing RLS, never an admin/service-role bypass. Files enter the **existing public bucket**, so even a partial upload can become accessible before the database row exists. Only use content cleared for public release.
- Content hashes determine video IDs, quality IDs and storage paths. Repeat imports of identical bytes reuse assets and rows. Immutable uploads are never overwritten. A failed upload response is reconciled against the stored bytes before proceeding. Retries repair missing quality rows and never reset views, likes, comments, scores or dates.
- Deduplication covers byte-identical files imported by this tool. Different encodes/edits of the same work, old manual uploads and equivalent titles are not perceptually deduplicated. Do not call this universal duplicate detection.
- Each item is independently resumable, not one transaction across storage and Postgres. An interruption may leave public media objects without a video row; rerun the same reviewed manifest. It does not delete unknown objects or existing user content. A competing import to another channel can leave unused objects in the losing channel's storage path; reconcile these deliberately before large-scale ingestion.

## Prepare a reviewed batch

Use Node.js 22 or newer, the repository's installed dependencies, `ffmpeg` and `ffprobe` on the operator machine. Keep source files and review manifests outside the repository; no binary catalog or duplicate app folders are needed.

Create a manifest like this next to the authorized local MP4. The example is intentionally **not approved**; it must fail until an actual reviewer has checked the work and filled in real provenance. This is a format example, not a supplied video or license grant.

```json
{
  "version": 1,
  "items": [
    {
      "file": "approved-short.mp4",
      "title": "Actual video title",
      "description": "Accurate description of this video.",
      "format": "short",
      "language": "hi",
      "category": "Education",
      "tags": ["science"],
      "creator": "Actual rights holder",
      "attribution": "Full attribution required by this source",
      "sourceUrl": "https://example.org/replace-with-source-page",
      "license": "CC-BY-4.0",
      "licenseEvidenceUrl": "https://example.org/replace-with-license-evidence",
      "changes": "Describe any prior editing and preserve earlier modification notices.",
      "review": {
        "approved": false,
        "reviewer": "Reviewer name",
        "reviewedAt": "2026-09-16",
        "fullVideoAndAudioRights": false,
        "spokenAudioConfirmed": false,
        "embeddedAttributionConfirmed": false
      }
    }
  ]
}
```

For an unchanged work, use `changes: "None; original file and credits retained."` Only declare a license that applies to the actual submitted file, including its audio. The source license does not automatically cover added music, subtitles or narration. Use `format: "long"` for horizontal/full-length videos.

Run the offline preflight:

```sh
node scripts/import-movion-content.mjs --manifest /absolute/path/batch.json
```

The output includes measured duration, dimensions, byte count, SHA-256, license and language. Preflight does not validate a destination account, storage quota, source availability or legal truth. The defaults are at most **10 items, 50 MiB per file, 250 MiB per batch including thumbnails**. Larger files require deliberate preparation and an appropriate hosting plan; for sustained large uploads, Supabase recommends resumable uploads. This pilot uses standard uploads and does not claim resumable byte-range transfer.

## Publishing a reviewed first batch

Have the approved channel owner authenticate through the existing secure sign-in flow. Supply these values as protected runtime environment variables, never in chat, code, logs or the manifest:

- `SUPABASE_URL`: actual connected project origin. At implementation time this Movion app uses `https://plmhjuqedtkiffzhberf.supabase.co`. Another connected project also named Sha-Verse is not the app database.
- `SUPABASE_PUBLISHABLE_KEY`: the corresponding public project key.
- `MOVION_ACCESS_TOKEN`: a valid, short-lived access token for the **destination channel owner**. No refresh token is requested or persisted. If it expires, authenticate again and repeat the batch.

```sh
node scripts/import-movion-content.mjs --manifest /absolute/path/batch.json --channel CHANNEL_UUID --publish
```

Use the actual selected channel UUID; there are multiple channels with similar Sha-Verse names. The tool does not guess an owner or create accounts/channels. `--publish` uploads publicly accessible media and inserts feed rows, so it is the publishing operation. It does not deploy the website or enable a recurring job.

Successful records appear through existing feeds/realtime. Verify both a Short and a long video with sound, credits and playback tracking on the intended devices before expanding the batch. Existing content moderation and reporting still apply. Imports start with the existing database defaults for engagement; popularity must come from real viewers. Source-platform popularity must not be written into Movion's view counts or trending score.

## Scale boundary

The current frontend loads at most 50 newest Shorts and 50 newest long videos; the trending query loads 20. Adding a million database rows does not add endless pagination, guaranteed trending content or user acquisition. Continuous browsing through a much larger catalog requires a separately agreed feed-pagination change. No such change is included here.

For context, **1,000,000 files averaging 20 MB require about 20 TB for originals alone**, before alternate qualities, thumbnails, backups or delivery traffic. This is an illustrative size calculation, not a provider quote. A serious rollout needs a licensed supply, language/category choices, moderation, a byte budget, delivery capacity, indexed provenance/deduplication, persistent jobs and retries, and rights/takedown handling. A narrated Hindi/Urdu catalog may also require an original-script and licensed-voice production workflow. Those decisions remain open.

## Verification

```sh
node --check scripts/import-movion-content.mjs
node --test scripts/test-movion-import.mjs
```

Tests generate local synthetic MP4 fixtures, exercise real ffmpeg/ffprobe and the existing Supabase SDK against a fake HTTP backend. They cover source requirements, audio-stream/format checks, no-network preflight, ownership/approval rejection, byte preservation, retries after partial uploads/inserts/quality writes, deduplication and protected metrics. They do not publish synthetic videos or assert live production playback.
