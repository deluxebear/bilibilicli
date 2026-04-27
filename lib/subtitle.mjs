import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { defaultHeaders, parseJson } from "./client.mjs";

export async function uploadSubtitle(client, { file }) {
  if (!client.csrf) throw new Error("Missing bili_jct CSRF cookie. Run auth login again.");
  const bytes = await readFile(file);
  const form = new FormData();
  form.append("bucket", "subtitle");
  form.append("file", new Blob([bytes], { type: "application/x-subrip" }), basename(file));
  form.append("csrf", client.csrf);
  form.append("content_type", "application/x-subrip");
  const response = await fetch(`https://api.bilibili.com/x/upload/web/image?t=${Date.now()}&csrf=${encodeURIComponent(client.csrf)}`, {
    method: "POST",
    headers: defaultHeaders({ cookie: client.cookie, referer: "https://member.bilibili.com/" }),
    body: form
  });
  return {
    ok: response.ok,
    status: response.status,
    endpoint: "https://api.bilibili.com/x/upload/web/image",
    parsed: parseJson(await response.text())
  };
}

export async function saveSubtitleDraft(client, { cid, file, lan = "en" }) {
  const uploaded = await uploadSubtitle(client, { file });
  const location = uploaded.parsed?.data?.location;
  if (!uploaded.ok || !location) return { ok: false, stage: "upload-subtitle", uploaded };
  const url = location.replace(/^https?:/, "http:");
  const form = new FormData();
  form.append("oid", String(cid));
  form.append("type", "1");
  form.append("files", JSON.stringify([{ url, lan, subtitle_id: 0 }]));
  form.append("aid", "0");
  form.append("csrf", client.csrf);
  const response = await fetch(`https://api.bilibili.com/x/v2/dm/subtitle/draft/preSave?t=${Date.now()}&csrf=${encodeURIComponent(client.csrf)}`, {
    method: "POST",
    headers: defaultHeaders({ cookie: client.cookie, referer: "https://member.bilibili.com/" }),
    body: form
  });
  const parsed = parseJson(await response.text());
  return {
    ok: response.ok && Number(parsed.code) === 0,
    status: response.status,
    endpoint: "https://api.bilibili.com/x/v2/dm/subtitle/draft/preSave",
    parsed,
    uploaded
  };
}

export function inferSubtitleLan(file) {
  const name = basename(file).toLowerCase();
  const match = name.match(/\.([a-z]{2}(?:-[a-z]{2,4})?)\.(srt|vtt|ass)$/i);
  return match?.[1] || "en";
}
