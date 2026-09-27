import { IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { UPLOADED_IMAGE_PATH } from "../../common/image-url.js";

export class CreateGalleryImageDto {
  @IsString()
  @Matches(UPLOADED_IMAGE_PATH, { message: "Invalid image URL" })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  /** Owner only: credit the piece to one of the salon's stylists. */
  @IsOptional()
  @IsString()
  stylistId?: string | null;
}

export class UpdateGalleryImageDto {
  /** null or "" clears the caption. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string | null;

  /** Owner only: re-credit (or un-credit with null) the piece. */
  @IsOptional()
  @IsString()
  stylistId?: string | null;
}
