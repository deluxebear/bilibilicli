---
name: bilibilicli
description: Use this skill when operating the local Bilibili video submission CLI in this repository, including login, auth capture, upload, cover upload, subtitle preSave, draft save/delete, parameter lookup for copyright/type/topic, and full video submission via Bilibili web APIs.
---

# bilibilicli

Use the repo-local CLI from the project root:

```bash
node bin/bilibilicli.mjs <command> --profile default
```

Prefer `node bin/bilibilicli.mjs ...` inside this repo. Use `bilibilicli ...` only after `npm link`.

## Safety

- Auth lives outside the repo at `~/.bilibilicli/profiles/<profile>/auth.json`.
- Browser profile lives at `~/.bilibilicli/browser-profiles/<profile>/`.
- Never print, copy, or commit cookies, captures, signed URLs, csrf values, or files under `~/.bilibilicli`.
- Submission commands are state-changing. Confirm intent before running `video run` or `archive submit`.
- `video draft`, `draft save`, and `draft delete` also mutate Bilibili state.

## First Checks

Run these before uploads:

```bash
node bin/bilibilicli.mjs auth status --profile default
node bin/bilibilicli.mjs doctor --profile default
node bin/bilibilicli.mjs commands list
```

If auth is missing or expired:

```bash
node bin/bilibilicli.mjs auth login --profile default
```

The command opens a real browser. Log in, then press Enter in the terminal.

## Parameter Lookup

Use live Bilibili APIs instead of hard-coding values.

```bash
node bin/bilibilicli.mjs params copyright
node bin/bilibilicli.mjs params types --compact
node bin/bilibilicli.mjs params topics --tid 27 --title "标题"
node bin/bilibilicli.mjs params topics --keyword "上B站看播客"
node bin/bilibilicli.mjs params topic-info --topic-id 1260884
```

Core submit fields:

- Type radio: `copyright=1` for `自制`, `copyright=2` for `转载`; `转载` requires `source`.
- Partition: `tid=<type id>`, from `params types`.
- Topic: `topic_id=<topic id>`, `topic_detail.from_topic_id=<topic id>`, `topic_detail.from_source="arc.web.<topic-from>"`.
- Activity topic: also pass `mission_id=<mission id>` when topic lookup returns one.

Example known topic:

```text
上B站看播客: topic_id=1260884, mission_id=4062466, topic-from=search
```

## Draft Workflow

Upload and save draft:

```bash
node bin/bilibilicli.mjs video draft \
  --profile default \
  --file ./inputs/video.mp4 \
  --cover-file ./inputs/cover.jpg \
  --subtitle-file ./inputs/subtitle.en.srt \
  --subtitle-lan en \
  --title "投稿标题" \
  --tid 27 \
  --tags "标签1,标签2" \
  --description "简介"
```

Delete a draft:

```bash
node bin/bilibilicli.mjs draft delete --profile default --id <draft-id>
```

Important: Bilibili currently accepts subtitle `preSave` during draft creation, but the draft editor does not reliably reload persisted subtitle files. Do not treat a draft as proof that subtitles are attached. For subtitle-sensitive uploads, use the publish workflow or recapture the website.

## Publish Workflow

Full upload and submit:

```bash
node bin/bilibilicli.mjs video run \
  --profile default \
  --file ./inputs/video.mp4 \
  --cover-file ./inputs/cover.jpg \
  --subtitle-file ./inputs/subtitle.en.srt \
  --subtitle-lan en \
  --title "投稿标题" \
  --tid 27 \
  --tags "标签1,标签2" \
  --description "简介" \
  --topic-id 1260884 \
  --mission-id 4062466 \
  --topic-from search
```

`video run` uploads the video, optionally uploads cover and subtitle, calls subtitle `preSave`, then submits archive via `/x/vu/web/add/v3`. When subtitles are present, the CLI sends `videos[0].pre_subtitle=true`.

## Low-Level Commands

Use these for debugging or custom chaining:

```bash
node bin/bilibilicli.mjs upload file --profile default --file ./video.mp4
node bin/bilibilicli.mjs cover upload --profile default --file ./cover.jpg
node bin/bilibilicli.mjs subtitle save --profile default --cid <cid> --file ./subtitle.en.srt --lan en
node bin/bilibilicli.mjs archive submit --profile default --filename <filename> --title "标题" --tid 27 --tags "标签1,标签2"
```

## When Bilibili Changes

Capture the browser workflow:

```bash
node bin/bilibilicli.mjs auth capture \
  --profile default \
  --url https://member.bilibili.com/platform/upload/video/frame
```

Perform the action in the browser, press Enter, then inspect the redacted capture at:

```text
~/.bilibilicli/profiles/default/capture-summary.json
```

Compare the capture against `lib/archive.mjs`, `lib/upload.mjs`, `lib/subtitle.mjs`, and `lib/params.mjs`.
