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
  let newFilePath;
  try {
    await Bun.write(fullPath, video);
    newFilePath = await processVideoForFastStart(fullPath);
    const aspectRatio = await getVideoAspectRatio(newFilePath);
    const s3Key = `${aspectRatio}/${fileName}.${extension}`;
    const s3file = cfg.s3Client.file(s3Key);
    await s3file.write(Bun.file(newFilePath, { type: "video/mp4" }));
    videoMetadata.videoURL = `${cfg.s3CfDistribution}/${s3Key}`;
    await updateVideo(cfg.db, videoMetadata);
  }
  finally {
    if (newFilePath !== undefined) {
      await rm(newFilePath, {force: true});
    }
    await rm(fullPath, { force: true});
  }
  return respondWithJSON(200, videoMetadata);
};

export async function getVideoAspectRatio(filepath: string) {
  const proc = Bun.spawn(["ffprobe", "-v", "error", "-select_streams",
     "v:0", "-show_entries", "stream=width,height", "-of", "json", filepath],
  );
  const stdoutText = await new Response(proc.stdout).text();
  const stderrText = await new Response(proc.stderr).text();
  if (await proc.exited !== 0) {
    throw new Error("Something went wrong with the process to check the aspect ratio")
  };
  type outline = {
    streams: [ { width: number ,
      height: number
    }]
  }
  const outlineAsJSON = JSON.parse(stdoutText) as outline;
  const width = outlineAsJSON.streams[0].width;
  const height = outlineAsJSON.streams[0].height;
  let aspectRatio;
  if (Math.floor(16/9) * 10 === Math.floor((width / height) ) * 10) {
    aspectRatio = "landscape";
  }
  else if (Math.floor(9/16) * 10 === Math.floor((width / height)) * 10) {
    aspectRatio = "portrait"
  } else {
    aspectRatio = "other";
  }
  return aspectRatio
};

export async function processVideoForFastStart(inputFilePath: string) {
  const newFilePath = inputFilePath + ".processed";
  const proc = Bun.spawn(["ffmpeg", "-i", inputFilePath, "-movflags", "faststart", "-map_metadata",
    "0", "-codec", "copy", "-f", "mp4", newFilePath
  ]);
  if (await proc.exited !== 0) {
    throw new Error("Something went wrong with the process to process video for fast start");
  };
  return newFilePath;
};