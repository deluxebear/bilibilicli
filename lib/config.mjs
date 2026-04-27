import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getPaths } from "./paths.mjs";

const defaults = {
  uploadPage: "https://member.bilibili.com/platform/upload/video/frame",
  retryCount: 3,
  retryDelayMs: 1000,
  chunkSize: 8 * 1024 * 1024
};

export async function readConfig() {
  const paths = getPaths();
  try {
    return { ...defaults, ...JSON.parse(await readFile(paths.configFile, "utf8")) };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return defaults;
  }
}

export async function listConfig() {
  return { ok: true, path: getPaths().configFile, config: await readConfig() };
}

export async function getConfig(key) {
  return (await readConfig())[key];
}

export async function setConfig(key, rawValue) {
  if (!key) throw new Error("Missing config key");
  const paths = getPaths();
  const config = await readConfig();
  config[key] = parseValue(rawValue);
  await mkdir(dirname(paths.configFile), { recursive: true, mode: 0o700 });
  await writeFile(paths.configFile, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  return { ok: true, path: paths.configFile, config };
}

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(String(value))) return Number(value);
  return value;
}
