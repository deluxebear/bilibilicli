---
name: bilibilicli
description: Use this skill when operating or installing the bilibilicli Bilibili video submission CLI, including browser login, auth capture, upload, cover upload, subtitle preSave, draft save/delete, copyright/type/topic parameter lookup, and full video submission through Bilibili creator web APIs.
---

# bilibilicli

Use this skill to run the `bilibilicli` npm CLI for Bilibili creator uploads. The skill can be installed from GitHub with:

```bash
npx skills add deluxebear/bilibilicli --skill bilibilicli
```

For global agent-level installation:

```bash
npx skills add deluxebear/bilibilicli --skill bilibilicli -g -y
```

## Command Runner

Prefer an installed global command when available:

```bash
bilibilicli <command> --profile default
```

If `bilibilicli` is not installed, run the published npm package without installing it globally:

```bash
npx -y @deluxebear/bilibilicli <command> --profile default
```

Inside this repository during development, `node bin/bilibilicli.mjs <command>` is also valid, but do not assume users of the installed skill have the repo checked out.

## Safety

- Auth lives outside the repo at `~/.bilibilicli/profiles/<profile>/auth.json`.
- Browser profiles live at `~/.bilibilicli/browser-profiles/<profile>/`.
- Never print, copy, commit, or summarize cookies, CSRF tokens, signed upload URLs, captures, or files under `~/.bilibilicli`.
- `upload file`, `cover upload`, `subtitle save`, `draft save`, `draft delete`, `archive submit`, `video draft`, and `video run` mutate remote Bilibili state.
- Confirm intent before running `video run`, `archive submit`, or deleting drafts.

## First Checks

Run these before uploads:

```bash
bilibilicli auth status --profile default
bilibilicli doctor --profile default
bilibilicli commands list
```

If auth is missing or expired:

```bash
bilibilicli auth login --profile default
```

The command opens a real browser. Log in to Bilibili, then press Enter in the terminal so cookies are saved locally.

## Parameter Lookup

Use live Bilibili APIs instead of hard-coding values:

```bash
bilibilicli params copyright
bilibilicli params types --compact
bilibilicli params topics --tid 27 --title "标题"
bilibilicli params topics --keyword "上B站看播客"
bilibilicli params topic-info --topic-id 1260884
```

Core submit fields:

- Type: `copyright=1` for `自制`, `copyright=2` for `转载`; `转载` requires `source`.
- Partition: `tid=<type id>`, from `params types`.
- Topic: `topic_id=<topic id>`, `topic_detail.from_topic_id=<topic id>`, `topic_detail.from_source="arc.web.<topic-from>"`.
- Activity topic: also pass `mission_id=<mission id>` when topic lookup returns one.

Known captured topic:

```text
上B站看播客: topic_id=1260884, mission_id=4062466, topic-from=search
```

## Draft Workflow

Upload a video and save it as a draft:

```bash
bilibilicli video draft \
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
bilibilicli draft delete --profile default --id <draft-id>
```

Important: Bilibili currently accepts subtitle `preSave` during draft creation, but the draft editor does not reliably reload persisted subtitle files. Do not treat a draft as proof that subtitles are attached. For subtitle-sensitive uploads, prefer `video run` or recapture the website flow.

## Publish Workflow

Upload, attach optional cover/subtitle, then submit the archive:

```bash
bilibilicli video run \
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

When subtitles are present, the CLI uploads the subtitle image/file material, calls subtitle `preSave`, and sends `videos[0].pre_subtitle=true` to `/x/vu/web/add/v3`.

## Low-Level Commands

Use these for debugging or custom chaining:

```bash
bilibilicli upload file --profile default --file ./video.mp4
bilibilicli cover upload --profile default --file ./cover.jpg
bilibilicli subtitle save --profile default --cid <cid> --file ./subtitle.en.srt --lan en
bilibilicli draft save --profile default --filename <filename> --cid <cid> --title "标题" --tid 27 --tags "标签1,标签2"
bilibilicli draft subtitle --profile default --id <draft-id> --lan en
bilibilicli archive submit --profile default --filename <filename> --title "标题" --tid 27 --tags "标签1,标签2"
```

## When Bilibili Changes

Capture the browser workflow:

```bash
bilibilicli auth capture \
  --profile default \
  --url https://member.bilibili.com/platform/upload/video/frame
```

Perform the action in the opened browser, press Enter, then inspect the redacted capture at:

```text
~/.bilibilicli/profiles/default/capture-summary.json
```

Compare the capture against `lib/archive.mjs`, `lib/upload.mjs`, `lib/subtitle.mjs`, and `lib/params.mjs` in the project source.
