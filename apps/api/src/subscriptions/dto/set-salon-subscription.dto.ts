import { IsDateString, IsString, ValidateIf } from "class-validator";

export class SetSalonSubscriptionDto {
  /** null removes the plan (no limits). */
  @ValidateIf((_, v) => v !== null)
  @IsString()
  planId!: string | null;

  /** ISO instant; null = no end date. */
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  expiresAt!: string | null;
}
