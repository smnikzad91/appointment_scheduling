import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, Max, Min } from "class-validator";

/** Days after a completed appointment for the "time to book again" SMS. */
export const REBOOK_DAYS_MIN = 1;
export const REBOOK_DAYS_MAX = 365;

/** A service (or a stylist's own length for it) lasts at most 10 hours — apps/web lib/serviceDuration.ts says the same. */
export const MAX_SERVICE_MINUTES = 600;

export class CreateServiceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsInt()
  @IsPositive()
  @Max(MAX_SERVICE_MINUTES)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  priceToman!: number;

  @IsOptional()
  @IsBoolean()
  rebookReminderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(REBOOK_DAYS_MIN)
  @Max(REBOOK_DAYS_MAX)
  rebookReminderDays?: number;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // null moves the service back to "no category" (@IsOptional lets null through validation).
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(MAX_SERVICE_MINUTES)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceToman?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  rebookReminderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(REBOOK_DAYS_MIN)
  @Max(REBOOK_DAYS_MAX)
  rebookReminderDays?: number;
}

