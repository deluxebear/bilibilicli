import { defaultHeaders, requestJson } from "./client.mjs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

export async function submitArchive(client, input) {
  if (!client.csrf) throw new Error("Missing bili_jct CSRF cookie. Run auth login again.");
  const body = {
    copyright: input.copyright,
    source: input.source || "",
    tid: input.tid,
    title: input.title,
    desc_format_id: 0,
    desc: input.description || "",
    dynamic: "",
    tag: input.tags.join(","),
    videos: [
      {
        filename: input.filename,
        title: input.videoTitle || input.title,
        desc: ""
      }
    ],
    cover: input.cover || "",
    no_reprint: 1,
    subtitle: { open: 0, lan: "" },
    csrf: client.csrf
  };
  return requestJson({
    config: client.config,
    url: "https://member.bilibili.com/x/vu/web/add/v3",
    method: "POST",
    headers: defaultHeaders({ cookie: client.cookie, contentType: "application/json" }),
    body: JSON.stringify(body)
  });
}

export async function saveDraft(client, input) {
  if (!client.csrf) throw new Error("Missing bili_jct CSRF cookie. Run auth login again.");
  const now = Date.now();
  const body = {
    videos: [
      {
        filename: input.filename,
        title: input.videoTitle || input.title,
        desc: input.videoDescription || "",
        cid: Number(input.cid || 0),
        is_4k: Boolean(input.is4k),
        is_8k: Boolean(input.is8k),
        is_hdr: Boolean(input.isHdr)
      }
    ],
    cover: input.cover || "",
    cover43: input.cover43 || input.cover || "",
    ai_cover: 0,
    is_ab_cover: 0,
    ab_cover_info: null,
    title: input.title,
    copyright: input.copyright,
    tid: input.tid,
    tag: input.tags.join(","),
    desc: input.description || "",
    recreate: -1,
    dynamic: input.dynamic || "",
    is_only_self: Number(input.isOnlySelf || 0),
    space_hidden: Number(input.spaceHidden || 2),
    watermark: { state: Number(input.watermark ?? 1) },
    no_reprint: Number(input.noReprint ?? 1),
    subtitle: { open: 0, lan: "" },
    dolby: 0,
    lossless_music: 0,
    up_selection_reply: false,
    up_close_reply: false,
    up_close_danmu: false,
    csrf: client.csrf
  };
  return requestJson({
    config: client.config,
    url: `https://member.bilibili.com/x/vupre/web/draft/add?t=${now}&csrf=${encodeURIComponent(client.csrf)}`,
    method: "POST",
    headers: defaultHeaders({ cookie: client.cookie, contentType: "application/json" }),
    body: JSON.stringify(body)
  });
}

export async function uploadCover(client, { file }) {
  if (!client.csrf) throw new Error("Missing bili_jct CSRF cookie. Run auth login again.");
  const bytes = await readFile(file);
  const mime = mimeFor(file);
  const form = new FormData();
  form.set("cover", `data:${mime};base64,${bytes.toString("base64")}`);
  return requestJson({
    config: client.config,
    url: `https://member.bilibili.com/x/vu/web/cover/up?t=${Date.now()}&csrf=${encodeURIComponent(client.csrf)}`,
    method: "POST",
    headers: defaultHeaders({ cookie: client.cookie }),
    body: form
  });
}

function mimeFor(file) {
  const ext = extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}
