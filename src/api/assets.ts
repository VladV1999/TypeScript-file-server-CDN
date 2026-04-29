import { existsSync, mkdirSync } from "fs";

import type { ApiConfig } from "../config";

export function ensureAssetsDir(cfg: ApiConfig) {
  if (!existsSync(cfg.assetsRoot)) {
    mkdirSync(cfg.assetsRoot, { recursive: true });
  }
}

export function mediaTypeToExtension(mediaType: string) {
  if (!(mediaType.includes("/"))) {
    throw new Error("This is not a valid media type!");
  }
  const parts = mediaType.split("/");
  const extension = `.${parts.at(parts.length - 1)}`
  return extension;
}
