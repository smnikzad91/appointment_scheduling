import { IsOptionalImageUrl } from "../../common/image-url.js";
import { IsHexColor, IsLatitude, IsLongitude, IsOptional, IsString } from "class-validator";

export class UpdateSalonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptionalImageUrl()
  logoUrl?: string | null;

  @IsOptionalImageUrl()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsHexColor()
  brandColor?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
