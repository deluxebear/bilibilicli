import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { defaultHeaders, parseJson, requestJson } from "./client.mjs";

export async function preuploadVideo(client, { file }) {
  const info = await stat(file);
  const name = basename(file);
  const params = new URLSearchParams({
    name,
    size: String(info.size),
    r: "upos",
    profile: "ugcupos/bup",
    ssl: "0",
    version: "2.14.0",
    build: "2140000",
    upcdn: "bda2"
  });
  const url = `https://member.bilibili.com/preupload?${params}`;
  return requestJson({
    config: client.config,
    url,
    method: "GET",
    headers: defaultHeaders({ cookie: client.cookie })
  });
}

export async function uploadVideoFile(client, { file }) {
  const pre = await preuploadVideo(client, { file });
  if (!pre.ok || !pre.parsed) return { ok: false, stage: "preupload", preupload: pre };
  const predata = pre.parsed;
  const uploadUrl = buildUploadUrl(predata);
  const uploadId = await createMultipart(client, { uploadUrl, predata });
  const parts = await uploadParts(client, { file, uploadUrl, uploadId, predata, chunkSize: Number(predata.chunk_size || client.config.chunkSize) });
  const complete = await completeMultipart(client, { uploadUrl, uploadId, predata, parts });
  const filename = complete.parsed?.filename || predata.filename || String(predata.upos_uri || "").replace(/^upos:\/\//, "");
  return {
    ok: complete.ok,
    stage: "complete",
    parsed: {
      filename,
      uploadId,
      bizId: predata.biz_id,
      parts: parts.length,
      complete: complete.parsed
    },
    preupload: pre
  };
}

function buildUploadUrl(predata) {
  const endpoint = normalizeEndpoint(Array.isArray(predata.endpoint) ? predata.endpoint[0] : predata.endpoint);
  const uposUri = String(predata.upos_uri || "").replace(/^upos:\/\//, "");
  if (!endpoint || !uposUri) throw new Error("Preupload response did not include endpoint and upos_uri");
  return `${String(endpoint).replace(/\/$/, "")}/${uposUri}`;
}

function normalizeEndpoint(endpoint) {
  if (!endpoint) return "";
  if (String(endpoint).startsWith("//")) return `https:${endpoint}`;
  return String(endpoint);
}

function uposHeaders(client, predata, extra = {}) {
  return {
    ...defaultHeaders({ cookie: client.cookie }),
    ...(predata.auth ? { "x-upos-auth": predata.auth } : {}),
    ...extra
  };
}

async function createMultipart(client, { uploadUrl, predata }) {
  const url = `${uploadUrl}?uploads&output=json`;
  const response = await fetch(url, {
    method: "POST",
    headers: uposHeaders(client, predata)
  });
  const parsed = parseJson(await response.text());
  const uploadId = parsed.upload_id || parsed.uploadId;
  if (!response.ok || !uploadId) throw new Error(`Failed to create multipart upload: HTTP ${response.status}`);
  return uploadId;
}

async function uploadParts(client, { file, uploadUrl, uploadId, predata, chunkSize }) {
  const info = await stat(file);
  const totalChunks = Math.ceil(info.size / chunkSize);
  const parts = [];
  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * chunkSize;
    const endExclusive = Math.min(start + chunkSize, info.size);
    const size = endExclusive - start;
    const params = new URLSearchParams({
      partNumber: String(index + 1),
      uploadId,
      chunk: String(index),
      chunks: String(totalChunks),
      size: String(size),
      start: String(start),
      end: String(endExclusive),
      total: String(info.size)
    });
    const response = await fetch(`${uploadUrl}?${params}`, {
      method: "PUT",
      headers: uposHeaders(client, predata, {
        "content-length": String(size)
      }),
      body: createReadStream(file, { start, end: endExclusive - 1, highWaterMark: chunkSize }),
      duplex: "half"
    });
    if (!response.ok) throw new Error(`Chunk ${index + 1}/${totalChunks} failed: HTTP ${response.status}`);
    parts.push({ partNumber: index + 1, eTag: response.headers.get("etag") || "" });
  }
  return parts;
}

async function completeMultipart(client, { uploadUrl, uploadId, predata, parts }) {
  const params = new URLSearchParams({
    output: "json",
    name: predata.filename || "",
    profile: "ugcupos/bup",
    uploadId,
    biz_id: String(predata.biz_id || "")
  });
  const body = JSON.stringify({ parts });
  const response = await fetch(`${uploadUrl}?${params}`, {
    method: "POST",
    headers: uposHeaders(client, predata, { "content-type": "application/json" }),
    body
  });
  return { ok: response.ok, status: response.status, endpoint: uploadUrl, parsed: parseJson(await response.text()) };
}
