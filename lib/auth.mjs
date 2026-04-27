import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { chromium } from "playwright";
import { getPaths } from "./paths.mjs";
import { readConfig } from "./config.mjs";

const cookieDomains = [".bilibili.com", "bilibili.com", "member.bilibili.com", "api.bilibili.com"];

export async function login({ profile = "default", headless = false } = {}) {
  const paths = getPaths(profile);
  const config = await readConfig();
  await mkdir(paths.browserProfileDir, { recursive: true, mode: 0o700 });
  const context = await chromium.launchPersistentContext(paths.browserProfileDir, { headless });
  const page = await context.newPage();
  await page.goto(config.uploadPage, { waitUntil: "domcontentloaded" });
  console.error("Log in in the opened browser, then press Enter here to capture cookies.");
  await waitForEnter();
  const saved = await saveAuthFromContext({ context, paths });
  await context.close();
  return saved;
}

export async function capture({ profile = "default", url } = {}) {
  const paths = getPaths(profile);
  const config = await readConfig();
  await mkdir(paths.browserProfileDir, { recursive: true, mode: 0o700 });
  const context = await chromium.launchPersistentContext(paths.browserProfileDir, { headless: false });
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => {
    const requestUrl = request.url();
    if (!/bilibili\.com|bilivideo\.com|upos/i.test(requestUrl)) return;
    requests.push({
      method: request.method(),
      url: requestUrl.replace(/(SESSDATA|bili_jct|csrf|access_key)=([^&]+)/gi, "$1=[redacted]"),
      resourceType: request.resourceType(),
      headers: redactHeaders(request.headers()),
      postData: redactPostData(request.postData())
    });
  });
  page.on("response", async (response) => {
    const request = response.request();
    const requestUrl = response.url();
    if (!/member\.bilibili\.com\/(upload|x\/vu|x\/vupre)|api\.bilibili\.com\/x\/(upload|v2\/dm\/subtitle)/i.test(requestUrl)) return;
    const entry = {
      method: request.method(),
      url: requestUrl.replace(/(SESSDATA|bili_jct|csrf|access_key)=([^&]+)/gi, "$1=[redacted]"),
      response: {
        status: response.status(),
        headers: redactHeaders(response.headers())
      }
    };
    const contentType = response.headers()["content-type"] || "";
    if (/json|text/i.test(contentType)) {
      try {
        entry.response.body = redactPostData((await response.text()).slice(0, 4000));
      } catch {
        entry.response.body = "[unavailable]";
      }
    }
    requests.push(entry);
  });
  await page.goto(url || config.uploadPage, { waitUntil: "domcontentloaded" });
  console.error("Perform the upload steps you want to inspect, then press Enter here to save a redacted request summary.");
  await waitForEnter();
  const auth = await saveAuthFromContext({ context, paths });
  await mkdir(dirname(paths.captureFile), { recursive: true, mode: 0o700 });
  await writeFile(paths.captureFile, `${JSON.stringify({ capturedAt: new Date().toISOString(), requests }, null, 2)}\n`, { mode: 0o600 });
  await context.close();
  return { ok: true, profile, auth, captureFile: paths.captureFile, requestCount: requests.length };
}

export async function authStatus({ profile = "default" } = {}) {
  const paths = getPaths(profile);
  const auth = await readAuth(paths);
  return {
    ok: true,
    profile,
    authFile: paths.authFile,
    cookieCount: auth.cookies?.length || 0,
    hasSessdata: Boolean(findCookie(auth, "SESSDATA")),
    hasCsrf: Boolean(getCsrf(auth)),
    savedAt: auth.savedAt
  };
}

export async function readAuth(paths) {
  try {
    return JSON.parse(await readFile(paths.authFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`No auth found at ${paths.authFile}. Run: bilibilicli auth login --profile ${paths.profile}`);
    throw error;
  }
}

export function getCsrf(auth) {
  return findCookie(auth, "bili_jct")?.value || "";
}

export function cookieHeader(auth) {
  return (auth.cookies || [])
    .filter((cookie) => cookieDomains.some((domain) => cookie.domain.endsWith(domain) || domain.endsWith(cookie.domain)))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function findCookie(auth, name) {
  return (auth.cookies || []).find((cookie) => cookie.name === name);
}

async function saveAuthFromContext({ context, paths }) {
  const cookies = await context.cookies();
  const auth = {
    savedAt: new Date().toISOString(),
    cookies: cookies.filter((cookie) => /bilibili\.com|bilivideo\.com/i.test(cookie.domain))
  };
  await mkdir(dirname(paths.authFile), { recursive: true, mode: 0o700 });
  await writeFile(paths.authFile, `${JSON.stringify(auth, null, 2)}\n`, { mode: 0o600 });
  return {
    ok: true,
    profile: paths.profile,
    authFile: paths.authFile,
    cookieCount: auth.cookies.length,
    hasSessdata: Boolean(findCookie(auth, "SESSDATA")),
    hasCsrf: Boolean(getCsrf(auth)),
    savedAt: auth.savedAt
  };
}

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });
}

function redactHeaders(headers) {
  const out = { ...headers };
  for (const key of Object.keys(out)) {
    if (/cookie|authorization|token|csrf/i.test(key)) out[key] = "[redacted]";
  }
  return out;
}

function redactPostData(postData) {
  if (!postData) return postData;
  return postData
    .replace(/("(?:csrf|token|upload_token|access_key|SESSDATA|bili_jct)"\s*:\s*")[^"]+/gi, "$1[redacted]")
    .replace(/("(?:cover|cover43|url|upload_url|endpoint|auth)"\s*:\s*")[^"]{40,}/gi, "$1[redacted]")
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, "[base64-image]");
}
