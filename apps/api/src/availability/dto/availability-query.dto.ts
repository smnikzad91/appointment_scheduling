import { Transform } from "class-transformer";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class AvailabilityQueryDto {
  @IsDateString()
  date!: string; // "YYYY-MM-DD"

  @Transform(({ value }) => (typeof value === "string" ? value.split(",").filter(Boolean) : value))
  @IsString({ each: true })
  serviceIds!: string[];

  @IsOptional()
  @IsString()
  stylistId?: string;
}
