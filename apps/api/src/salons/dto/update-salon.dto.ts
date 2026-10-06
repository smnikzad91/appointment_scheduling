import { IsOptionalImageUrl } from "../../common/image-url.js";
import type { ServiceLocation } from "@appointment-scheduling/database";
import { IsHostSalonName, IsServiceArea, IsServiceLocations } from "./service-locations.js";
import { IsHexColor, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateSalonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Province and city are validated as a pair (packages/iran-locations); send both to change either. */
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(300)
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

  /** Independent stylists only (ignored for salons). */
  @IsServiceLocations()
  serviceLocations?: ServiceLocation[];

  @IsServiceArea()
  serviceArea?: string | null;

  @IsHostSalonName()
  hostSalonName?: string | null;
}
