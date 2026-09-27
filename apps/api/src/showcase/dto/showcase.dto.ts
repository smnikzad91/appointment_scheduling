import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from "class-validator";
import { IsOptionalImageUrl } from "../../common/image-url.js";

export class UpdateBannerDto {
  @IsOptionalImageUrl()
  imageUrl?: string | null;

  /** Where the banner links to — http(s) only, so no javascript: or other schemes. */
  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true }, { message: "Invalid link URL" })
  @MaxLength(500)
  linkUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/** The featured list in priority order (first = priority 1); at most three. */
export class SetFeaturedDto {
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  ids!: string[];
}

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;
}

export class UpdateShowcaseSettingsDto {
  /** Approved star ratings a salon/stylist needs before it can appear in "top rated". */
  @IsInt()
  @Min(1)
  @Max(50)
  minRatings!: number;
}
