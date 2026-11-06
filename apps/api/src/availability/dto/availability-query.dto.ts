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

  /** The code of a freed time held for this visitor (their SLOT_OPENED link): that hold doesn't block them. */
  @IsOptional()
  @IsString()
  hold?: string;
}
