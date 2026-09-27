import { Type } from "class-transformer";
import { IsIn, IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class SearchSalonsDto {
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  /** Matches the salon name, its address or one of its active services. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  /** The customer's position; when set, results carry distanceKm and default to nearest first. */
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  /** Only salons within this many km (needs lat/lng). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(500)
  radiusKm?: number;

  /** distance (needs lat/lng) | rating. Default: distance when lat/lng are given, else rating. */
  @IsOptional()
  @IsIn(["distance", "rating"])
  sort?: "distance" | "rating";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
