export const commandRegistry = [
  "auth login --profile default",
  "auth capture --profile default --url <upload-page>",
  "auth status --profile default",
  "doctor --profile default",
  "config list|get|set",
  "upload preupload --file <path>",
  "upload file --file <path>",
  "cover upload --file <path>",
  "subtitle save --cid <cid> --file <path> --lan en",
  "draft save --filename <uploaded-filename> --cid <cid> --title <title> --tid <id> --tags a,b",
  "draft subtitle --id <draft-id> --lan en",
  "draft delete --id <draft-id>",
  "archive submit --filename <upos-filename> --title <title> --tid <id> --tags a,b --subtitle-lan en",
  "video draft --file <path> --title <title> --tid <id> --tags a,b --cover-file cover.jpg --subtitle-file sub.srt",
  "video run --file <path> --title <title> --tid <id> --tags a,b --cover-file cover.jpg --subtitle-file sub.srt"
];

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

export function printJson(value, args = {}) {
  const redacted = redact(value);
  console.log(JSON.stringify(redacted, null, args.compact ? 0 : 2));
}

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "string") {
    if (/X-Amz-Signature=|upload_token=|SESSDATA|bili_jct|access_key/i.test(value)) return "[redacted]";
    return value;
  }
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (/cookie|token|sessdata|bili_jct|authorization|auth|signed|location/i.test(key)) {
      out[key] = child ? "[redacted]" : child;
    } else if (key === "url" && typeof child === "string" && /X-Amz-Signature=|bilivideo\.com/i.test(child)) {
      out[key] = "[redacted]";
    } else {
      out[key] = redact(child);
    }
  }
  return out;
}

export function usage() {
  return `bilibilicli

Commands:
  bilibilicli auth login --profile default
  bilibilicli auth capture --profile default --url https://member.bilibili.com/platform/upload/video/frame
  bilibilicli auth status --profile default
  bilibilicli doctor --profile default
  bilibilicli upload preupload --file ./video.mp4
  bilibilicli upload file --file ./video.mp4
  bilibilicli cover upload --file ./cover.jpg
  bilibilicli subtitle save --cid <cid> --file ./subtitle.en.srt --lan en
  bilibilicli draft save --filename <uploaded-filename> --cid <cid> --title "标题" --tid 17 --tags tag1,tag2
  bilibilicli draft subtitle --id <draft-id> --lan en
  bilibilicli draft delete --id <draft-id>
  bilibilicli archive submit --filename <upos-filename> --title "标题" --tid 17 --tags tag1,tag2 --subtitle-lan en
  bilibilicli video draft --file ./video.mp4 --title "标题" --tid 17 --tags tag1,tag2 --cover-file ./cover.jpg --subtitle-file ./subtitle.en.srt
  bilibilicli video run --file ./video.mp4 --title "标题" --tid 17 --tags tag1,tag2 --cover-file ./cover.jpg --subtitle-file ./subtitle.en.srt

Global flags:
  --profile <name>   auth profile, default: default
  --compact          print one-line JSON
`;
}
