import { setTimeout as delay } from "node:timers/promises";
import { getPaths } from "./paths.mjs";
import { readConfig } from "./config.mjs";
import { cookieHeader, getCsrf, readAuth } from "./auth.mjs";

export async function createClient({ profile = "default" } = {}) {
  const paths = getPaths(profile);
  const [config, auth] = await Promise.all([readConfig(), readAuth(paths)]);
  return {
    paths,
    config,
    auth,
    csrf: getCsrf(auth),
    cookie: cookieHeader(auth),
    account: () => requestJson({
      config,
      url: "https://api.bilibili.com/x/web-interface/nav",
      headers: defaultHeaders({ cookie: cookieHeader(auth), referer: "https://www.bilibili.com/" }),
      method: "GET"
    })
  };
}

export async function requestJson({ config, url, method = "GET", headers = {}, body }) {
  const retryCount = Number(config?.retryCount ?? 3);
  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const response = await fetch(url, { method, headers, body });
      const text = await response.text();
      const parsed = parseJson(text);
      if (response.status >= 500 || response.status === 429) {
        lastError = new Error(`Retryable HTTP ${response.status}`);
      } else {
        return { ok: response.ok, status: response.status, endpoint: safeEndpoint(url), parsed };
      }
    } catch (error) {
      lastError = error;
    }
    if (attempt < retryCount) await delay(Number(config?.retryDelayMs ?? 1000) * (attempt + 1));
  }
  throw lastError;
}

export function defaultHeaders({ cookie, referer, contentType } = {}) {
  return {
    accept: "application/json, text/plain, */*",
    origin: "https://member.bilibili.com",
    referer: referer || "https://member.bilibili.com/platform/upload/video/frame",
    "user-agent": "Mozilla/5.0 bilibilicli",
    ...(contentType ? { "content-type": contentType } : {}),
    ...(cookie ? { cookie } : {})
  };
}

export function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function safeEndpoint(url) {
  const parsed = new URL(url);
  parsed.search = "";
  return parsed.toString();
}
