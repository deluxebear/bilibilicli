import { defaultHeaders, requestJson } from "./client.mjs";

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
