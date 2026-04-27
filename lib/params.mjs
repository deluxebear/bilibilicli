import { defaultHeaders, requestJson } from "./client.mjs";

export function listCopyrightParams() {
  return {
    ok: true,
    submitField: "copyright",
    values: [
      { value: 1, label: "自制", requiredWith: [], notes: "原创/自制内容" },
      { value: 2, label: "转载", requiredWith: ["source"], notes: "转载内容；提交时需要 source" }
    ]
  };
}

export async function listTypeParams(client, { flat = true } = {}) {
  const pre = await requestJson({
    config: client.config,
    url: `https://member.bilibili.com/x/vupre/web/archive/pre?t=${Date.now()}`,
    headers: defaultHeaders({ cookie: client.cookie }),
    method: "GET"
  });
  const typelist = pre.parsed?.data?.typelist || [];
  return {
    ok: pre.ok,
    endpoint: pre.endpoint,
    submitField: "tid",
    typeMode: pre.parsed?.data?.type_mode,
    count: flattenTypes(typelist).length,
    values: flat ? flattenTypes(typelist) : typelist
  };
}

export async function listTopicParams(client, { tid, title = "", keyword = "", ps = 20 } = {}) {
  if (keyword) return searchTopics(client, { keyword, ps });
  if (!tid) throw new Error("Missing required flag --tid when listing recommended topics.");
  const types = await listTypeParams(client, { flat: true });
  const type = types.values.find((item) => Number(item.id) === Number(tid));
  const parentId = type?.parent || 0;
  const url = new URL("https://member.bilibili.com/x/vupre/web/topic/type/v2");
  url.searchParams.set("pn", "0");
  url.searchParams.set("ps", String(ps));
  url.searchParams.set("title", title);
  url.searchParams.set("platform", "pc");
  url.searchParams.set("type_id", String(tid));
  url.searchParams.set("type_pid", String(parentId));
  url.searchParams.set("t", String(Date.now()));
  const result = await requestJson({
    config: client.config,
    url: url.toString(),
    headers: defaultHeaders({ cookie: client.cookie }),
    method: "GET"
  });
  return {
    ok: result.ok,
    endpoint: result.endpoint,
    submitFields: ["topic_id", "topic_detail", "mission_id"],
    request: { tid: Number(tid), type_pid: parentId, title, ps: Number(ps), mode: "recommend" },
    values: normalizeTopics(result.parsed?.data?.topics || [], "recommend")
  };
}

export async function topicInfo(client, { topicId }) {
  const info = await requestJson({
    config: client.config,
    url: `https://member.bilibili.com/x/vupre/web/topic/info?topic_id=${encodeURIComponent(topicId)}&t=${Date.now()}`,
    headers: defaultHeaders({ cookie: client.cookie }),
    method: "GET"
  });
  const mission = await requestJson({
    config: client.config,
    url: `https://member.bilibili.com/x/vupre/web/topic/mission/check?topic_id=${encodeURIComponent(topicId)}&t=${Date.now()}`,
    headers: defaultHeaders({ cookie: client.cookie }),
    method: "GET"
  });
  return {
    ok: info.ok && mission.ok,
    submitFields: ["topic_id", "topic_detail", "mission_id"],
    topic: info.parsed?.data,
    mission: mission.parsed?.data
  };
}

async function searchTopics(client, { keyword, ps }) {
  const url = new URL("https://member.bilibili.com/x/vupre/web/topic/search");
  url.searchParams.set("keywords", keyword);
  url.searchParams.set("page_size", String(ps));
  url.searchParams.set("offset", "0");
  url.searchParams.set("t", String(Date.now()));
  const result = await requestJson({
    config: client.config,
    url: url.toString(),
    headers: defaultHeaders({ cookie: client.cookie }),
    method: "GET"
  });
  const topics = result.parsed?.data?.result?.topics || [];
  return {
    ok: result.ok,
    endpoint: result.endpoint,
    submitFields: ["topic_id", "topic_detail", "mission_id"],
    request: { keyword, ps: Number(ps), mode: "search" },
    values: normalizeTopics(topics, "search")
  };
}

function flattenTypes(nodes, parentName = "") {
  return (nodes || []).flatMap((node) => {
    const item = {
      id: node.id,
      parent: node.parent,
      parentName: parentName || node.parent_name || "",
      name: node.name,
      description: node.desc || node.description || "",
      copyRightMode: node.copy_right,
      show: Boolean(node.show),
      maxVideoCount: node.max_video_count
    };
    return [item, ...flattenTypes(node.children || [], node.name)];
  });
}

function normalizeTopics(topics, from) {
  return topics.map((topic) => {
    const id = topic.topic_id ?? topic.id;
    const name = topic.topic_name ?? topic.name;
    const missionId = topic.mission_id || 0;
    return {
      topic_id: id,
      topic_name: name,
      description: topic.topic_description || topic.description || topic.descr || "",
      mission_id: missionId,
      activity_text: topic.activity_text || topic.activity_sign || "",
      activity_description: topic.activity_description || topic.act_protocol || "",
      arc_play_vv: topic.arc_play_vv || 0,
      from,
      submit: {
        topic_id: id,
        topic_detail: { from_topic_id: id, from_source: `arc.web.${from}` },
        ...(missionId ? { mission_id: missionId } : {})
      }
    };
  });
}
