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
bilibilicli video run \
  --profile default \
  --file ./video.mp4 \
  --title "投稿标题" \
  --tid 17 \
  --tags "标签1,标签2" \
  --description "简介"
```

`upload file`, `archive submit`, and `video run` are state-changing commands. They upload media and/or create a Bilibili submission.

## Known Protocol

The first implementation uses these web endpoints:

- `GET https://api.bilibili.com/x/web-interface/nav` for read-only account diagnostics.
- `GET https://member.bilibili.com/preupload` for upload initialization.
- Upos multipart `POST ?uploads`, `PUT ?partNumber=...`, and `POST ?uploadId=...` for video bytes.
- `POST https://member.bilibili.com/x/vu/web/add/v3` for archive submission.

Bilibili can change required fields, CDN choices, or anti-abuse checks. If a command fails, run `auth capture`, perform the same action on the website, and compare the redacted capture with the CLI request shape.
