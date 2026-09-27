import { applyDecorators } from "@nestjs/common";
import { IsOptional, IsString, Matches } from "class-validator";

/**
 * Images are uploaded through apps/web (POST /api/upload), which stores them under
 * /uploads/<folder>/<uuid>.<ext>. Only accept such paths — never arbitrary external URLs.
 */
export const UPLOADED_IMAGE_PATH = /^\/uploads\/[a-z-]+\/[\w-]+\.(jpe?g|png|webp|gif)$/i;

/** Optional uploaded-image field; `null` clears it (IsOptional lets null through). */
export function IsOptionalImageUrl() {
  return applyDecorators(IsOptional(), IsString(), Matches(UPLOADED_IMAGE_PATH, { message: "Invalid image URL" }));
}
