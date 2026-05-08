import { respondWithJSON } from "./json";

import { type BunRequest } from "bun";
import { randomBytes } from "crypto";
import { rm } from "node:fs/promises";
import { getBearerToken, validateJWT } from "../auth";
import { type ApiConfig } from "../config";
import { getVideo, updateVideo } from "../db/videos";
import { BadRequestError, UserForbiddenError } from "./errors";

export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
  const MAX_UPLOAD_SIZE = 1 << 30;
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  };
  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);
  const videoMetadata = await getVideo(cfg.db, videoId);
  if (!videoMetadata) {
    throw new Error("Something went wrong retrieving the video");
  };
  if (videoMetadata.userID !== userID) {
    throw new UserForbiddenError("This user is not the author of the video!");
  };
  const parsedData = await req.formData();
  const video = parsedData.get("video");
  if (!(video instanceof File)) {
    throw new Error("Video is not a file!");
  };
  if (video.size > MAX_UPLOAD_SIZE) {
    throw new BadRequestError(`The video's size exceeds teh max of ${MAX_UPLOAD_SIZE}`);
  };
  if (video.type !== "video/mp4") {
    throw new BadRequestError("This video is not in the right format, it needs to be an MP4");
  }
  const pathToTemp = "/tmp/";
  const fileName = randomBytes(32).toString("hex");
  const extension = "mp4";
  const fullPath = `${pathToTemp}/${fileName}.${extension}`;
  try {
    await Bun.write(fullPath, video);
    const s3file = cfg.s3Client.file(`${fileName}.${extension}`);
    await s3file.write(Bun.file(fullPath, { type: "video/mp4" }));
    videoMetadata.videoURL = `https://tubely-1999.s3.us-east-2.amazonaws.com/${fileName}.${extension}`;
    await updateVideo(cfg.db, videoMetadata);
  }
  finally {
    await rm(fullPath, { force: true });
  }
  return respondWithJSON(200, null);
}
