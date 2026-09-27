import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

/** Staff (the stylist or the salon owner) changing an open appointment; omitted fields stay as they are. */
export class UpdateAppointmentDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsDateString()
  startAt?: string;

  /** `null` clears the note. */
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
