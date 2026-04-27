#!/usr/bin/env node
import { login, capture, authStatus } from "../lib/auth.mjs";
import { getConfig, listConfig, setConfig } from "../lib/config.mjs";
import { createClient } from "../lib/client.mjs";
import { preuploadVideo, uploadVideoFile } from "../lib/upload.mjs";
import { saveDraft, submitArchive, uploadCover } from "../lib/archive.mjs";
import { inferSubtitleLan, saveSubtitleDraft } from "../lib/subtitle.mjs";
import { commandRegistry, parseArgs, printJson, usage } from "../lib/cli.mjs";

async function main() {
  const [group, action, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const profile = args.profile || "default";

  if (!group || group === "--help" || group === "-h") {
    console.log(usage());
    return;
  }

  if (group === "commands" && action === "list") {
    printJson({ ok: true, commands: commandRegistry }, args);
    return;
  }

  if (group === "completion") {
    console.log("# Completion generation is not implemented yet. Use `bilibilicli commands list` for command discovery.");
    return;
  }

  if (group === "config") {
    if (action === "list") return printJson(await listConfig(), args);
    if (action === "get") return printJson({ ok: true, key: rest[0], value: await getConfig(rest[0]) }, args);
    if (action === "set") return printJson(await setConfig(rest[0], rest[1]), args);
  }

  if (group === "auth") {
    if (action === "login") return printJson(await login({ profile, headless: Boolean(args.headless) }), args);
    if (action === "capture") return printJson(await capture({ profile, url: args.url }), args);
    if (action === "status") return printJson(await authStatus({ profile }), args);
  }

  const client = await createClient({ profile });

  if (group === "doctor") {
    const account = await client.account();
    const accountData = account.parsed?.data || {};
    printJson({
      ok: account.ok,
      profile,
      checks: {
        authFile: client.paths.authFile,
        configFile: client.paths.configFile,
        account: {
          ok: account.ok,
          status: account.status,
          endpoint: account.endpoint,
          isLogin: Boolean(accountData.isLogin),
          mid: accountData.mid,
          uname: accountData.uname
        }
      }
    }, args);
    return;
  }

  if (group === "upload") {
    if (action === "preupload") {
      const file = requireFlag(args, "file");
      return printJson(await preuploadVideo(client, { file }), args);
    }
    if (action === "file") {
      const file = requireFlag(args, "file");
      return printJson(await uploadVideoFile(client, { file }), args);
    }
  }

  if (group === "cover" && action === "upload") {
    return printJson(await uploadCover(client, { file: requireFlag(args, "file") }), args);
  }

  if (group === "subtitle" && action === "save") {
    const file = requireFlag(args, "file");
    return printJson(await saveSubtitleDraft(client, {
      cid: requireFlag(args, "cid"),
      file,
      lan: args.lan || inferSubtitleLan(file)
    }), args);
  }

  if (group === "archive" && action === "submit") {
    return printJson(await submitArchive(client, {
      title: requireFlag(args, "title"),
      description: args.description || "",
      tid: Number(requireFlag(args, "tid")),
      tags: splitCsv(requireFlag(args, "tags")),
      copyright: Number(args.copyright || 1),
      source: args.source || "",
      filename: requireFlag(args, "filename"),
      videoTitle: args["video-title"] || args.title,
      cover: args.cover || ""
    }), args);
  }

  if (group === "draft" && action === "save") {
    return printJson(await saveDraft(client, {
      title: requireFlag(args, "title"),
      description: args.description || "",
      tid: Number(requireFlag(args, "tid")),
      tags: splitCsv(requireFlag(args, "tags")),
      copyright: Number(args.copyright || 1),
      filename: requireFlag(args, "filename"),
      cid: requireFlag(args, "cid"),
      videoTitle: args["video-title"] || args.title,
      cover: args.cover || "",
      cover43: args.cover43 || ""
    }), args);
  }

  if (group === "video" && action === "run") {
    const file = requireFlag(args, "file");
    const uploaded = await uploadVideoFile(client, { file });
    const submitted = await submitArchive(client, {
      title: requireFlag(args, "title"),
      description: args.description || "",
      tid: Number(requireFlag(args, "tid")),
      tags: splitCsv(requireFlag(args, "tags")),
      copyright: Number(args.copyright || 1),
      source: args.source || "",
      filename: uploaded.parsed.filename,
      videoTitle: args["video-title"] || args.title,
      cover: args.cover || ""
    });
    return printJson({ ok: uploaded.ok && submitted.ok, uploaded, submitted }, args);
  }

  if (group === "video" && action === "draft") {
    const file = requireFlag(args, "file");
    let cover = args.cover || "";
    let cover43 = args.cover43 || "";
    if (args["cover-file"]) {
      const uploadedCover = await uploadCover(client, { file: args["cover-file"] });
      const coverData = uploadedCover.parsed?.data || uploadedCover.parsed || {};
      cover = coverData.url || coverData.cover || cover;
      cover43 = coverData.url43 || coverData.cover43 || cover43 || cover;
    }
    const uploaded = await uploadVideoFile(client, { file });
    if (!uploaded.ok) return printJson({ ok: false, uploaded }, args);
    const uploadedData = uploaded.parsed || {};
    if (!uploadedData.filename || !(uploadedData.cid || uploadedData.bizId)) {
      return printJson({ ok: false, error: "Upload response did not include filename and cid/bizId", uploaded }, args);
    }
    let subtitle = null;
    if (args["subtitle-file"]) {
      subtitle = await saveSubtitleDraft(client, {
        cid: uploadedData.cid || uploadedData.bizId,
        file: args["subtitle-file"],
        lan: args["subtitle-lan"] || inferSubtitleLan(args["subtitle-file"])
      });
      if (!subtitle.ok) return printJson({ ok: false, uploaded, subtitle }, args);
    }
    const drafted = await saveDraft(client, {
      title: requireFlag(args, "title"),
      description: args.description || "",
      tid: Number(requireFlag(args, "tid")),
      tags: splitCsv(requireFlag(args, "tags")),
      copyright: Number(args.copyright || 1),
      filename: uploadedData.filename,
      cid: uploadedData.cid || uploadedData.bizId,
      videoTitle: args["video-title"] || args.title,
      cover,
      cover43
    });
    return printJson({ ok: uploaded.ok && (!subtitle || subtitle.ok) && drafted.ok, uploaded, subtitle, drafted }, args);
  }

  throw new Error(`Unknown command: ${[group, action].filter(Boolean).join(" ")}`);
}

function requireFlag(args, name) {
  if (!args[name]) throw new Error(`Missing required flag --${name}`);
  return args[name];
}

function splitCsv(value) {
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

main().catch((error) => {
  printJson({ ok: false, error: error.message, stack: process.env.DEBUG ? error.stack : undefined }, { compact: true });
  process.exitCode = 1;
});
