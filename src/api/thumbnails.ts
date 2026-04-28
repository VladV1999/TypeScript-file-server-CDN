import type { BunRequest } from "bun";
import { getBearerToken, validateJWT } from "../auth";
import type { ApiConfig } from "../config";
import { getVideo, updateVideo } from "../db/videos";
import { BadRequestError, UserForbiddenError } from "./errors";
import { respondWithJSON } from "./json";

const MAX_UPLOAD_SIZE = 10 << 20;

type Thumbnail = {
  data: ArrayBuffer;
  mediaType: string;
};

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  // TODO: implement the upload here
  const parsedData = await req.formData();
  const image = await parsedData.get("thumbnail");
  if (!(image instanceof File)) {
    throw new BadRequestError("This is not a file!");
  };
  if (image.size > MAX_UPLOAD_SIZE) {
    throw new BadRequestError(`The image's size exceeds the max of ${MAX_UPLOAD_SIZE}`);
  };
  const mediaType = image.type;
  const buffer = await image.arrayBuffer();
  const newBuffer = Buffer.from(buffer);
  const base64StringFromBuffer = newBuffer.toString("base64");
  const dataURL = `data:${mediaType};base64,${base64StringFromBuffer}`;
  
  const videoMetadata = await getVideo(cfg.db, videoId);
  if (videoMetadata === undefined) {
    throw new Error("Something went wrong retriving the video");
  }
  const newThumbnail: Thumbnail = {
    data: buffer,
    mediaType: mediaType
  };
  if (userID !== videoMetadata!.userID) {
    throw new UserForbiddenError("The current logged in user does not have the proper auth \n\
      to interact with this video");
  };
  
  videoMetadata.thumbnailURL = dataURL;
  await updateVideo(cfg.db, videoMetadata);
  return respondWithJSON(200, videoMetadata);
}
