import { Transform } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

/** Trims text before validation. */
const Trim = () => Transform(({ value }) => (typeof value === "string" ? value.trim() : value));

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

  /** The customer's name on this booking only (never their account); `null` or blank = the account's name. */
  @Trim()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(50)
  customerFirstName?: string | null;

  @Trim()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(50)
  customerLastName?: string | null;
}
