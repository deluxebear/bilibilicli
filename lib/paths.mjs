import { homedir } from "node:os";
import { join } from "node:path";

export function getPaths(profile = "default") {
  const root = join(homedir(), ".bilibilicli");
  const profileDir = join(root, "profiles", profile);
  return {
    root,
    profile,
    profileDir,
    configFile: join(root, "config.json"),
    authFile: join(profileDir, "auth.json"),
    browserProfileDir: join(root, "browser-profiles", profile),
    captureFile: join(profileDir, "capture-summary.json")
  };
}
