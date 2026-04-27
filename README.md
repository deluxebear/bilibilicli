# bilibilicli

Browser-assisted local CLI for Bilibili video submission.

This project keeps login in a real browser, stores cookies under `~/.bilibilicli`, and replays the upload/submission API from the CLI. Do not commit files from `~/.bilibilicli`; they contain private account material.

## Install

```bash
npm install
npm link
```

## Login

```bash
bilibilicli auth login --profile default
bilibilicli auth status --profile default
bilibilicli doctor --profile default
```

`auth login` opens Bilibili's member upload page with a persistent browser profile at:

```text
~/.bilibilicli/browser-profiles/default/
```

After logging in, press Enter in the terminal. Cookies are saved to:

```text
~/.bilibilicli/profiles/default/auth.json
```

## Capture Requests

Use this when Bilibili changes fields or when you need to compare the CLI with the website:

```bash
bilibilicli auth capture --profile default --url https://member.bilibili.com/platform/upload/video/frame
```

Perform the website workflow in the opened browser, then press Enter. A redacted request summary is saved to:

```text
~/.bilibilicli/profiles/default/capture-summary.json
```

## Commands

Read-only:

```bash
bilibilicli commands list
bilibilicli config list
bilibilicli auth status --profile default
bilibilicli doctor --profile default
```

Upload a file but do not submit an archive:

```bash
bilibilicli upload file --profile default --file ./video.mp4
```

Upload a cover image:

```bash
bilibilicli cover upload --profile default --file ./cover.jpg
```

Upload and attach a subtitle draft to an uploaded video `cid`:

```bash
bilibilicli subtitle save \
  --profile default \
  --cid "<cid returned by upload file>" \
  --file ./subtitle.en.srt \
  --lan en
```

Save an uploaded file as a draft:

```bash
bilibilicli draft save \
  --profile default \
  --filename "<filename returned by upload file>" \
  --cid "<cid returned by upload file>" \
  --title "投稿标题" \
  --tid 27 \
  --tags "学习" \
  --subtitle-lan en \
  --description "简介"
```

Delete a draft by draft id:

```bash
bilibilicli draft delete --profile default --id 3399934
```

Mark an existing draft as having subtitles:

```bash
bilibilicli draft subtitle --profile default --id 3399965 --lan en
```

Submit an uploaded file:

```bash
bilibilicli archive submit \
  --profile default \
  --filename "<filename returned by upload file>" \
  --title "投稿标题" \
  --tid 17 \
  --tags "标签1,标签2" \
  --description "简介"
```

Upload and submit in one command:

```bash
bilibilicli video draft \
  --profile default \
  --file ./video.mp4 \
  --cover-file ./cover.jpg \
  --subtitle-file ./subtitle.en.srt \
  --subtitle-lan en \
  --title "投稿标题" \
  --tid 27 \
  --tags "学习" \
  --description "简介"
```

The currently verified website path is "upload and save draft". Direct archive submission is kept as a low-level command and may need another capture of the final submit button before use.

Upload and submit in one command:

```bash
bilibilicli video run \
  --profile default \
  --file ./video.mp4 \
  --title "投稿标题" \
  --tid 17 \
  --tags "标签1,标签2" \
  --description "简介"
```

`upload file`, `draft save`, `video draft`, `archive submit`, and `video run` are state-changing commands. They upload media, save drafts, and/or create a Bilibili submission.

## Known Protocol

The first implementation uses these web endpoints:

- `GET https://api.bilibili.com/x/web-interface/nav` for read-only account diagnostics.
- `POST https://member.bilibili.com/upload/multipart/new` for current video upload initialization.
- `POST https://member.bilibili.com/upload/multipart/part`, signed `PUT`, and `POST https://member.bilibili.com/upload/multipart/complete` for current video bytes.
- `POST https://member.bilibili.com/x/vu/web/cover/up` for optional cover upload.
- `POST https://api.bilibili.com/x/upload/web/image` with `bucket=subtitle` for subtitle file upload.
- `POST https://api.bilibili.com/x/v2/dm/subtitle/draft/preSave` for attaching subtitle drafts.
- `POST https://member.bilibili.com/x/vupre/web/draft/add` for saving an upload as a draft.
- `POST https://member.bilibili.com/x/vupre/web/draft/update` for marking a saved draft subtitle language.
- `POST https://member.bilibili.com/x/vupre/web/draft/delete` for deleting a draft by id.
- Legacy `GET https://member.bilibili.com/preupload` and Upos multipart helpers are retained in code for older upload paths.
- `POST https://member.bilibili.com/x/vu/web/add/v3` for archive submission.

Bilibili can change required fields, CDN choices, or anti-abuse checks. If a command fails, run `auth capture`, perform the same action on the website, and compare the redacted capture with the CLI request shape.
