import { Type } from "class-transformer";
import { IsOptionalImageUrl } from "../../common/image-url.js";
import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsPositive, IsString, Max, Min, ValidateNested } from "class-validator";

export class InviteStylistDto {
  @IsString()
  phone!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  serviceIds?: string[];

  /** The stylist's share of the money received for their appointments, 0–100 %. Defaults to 20. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  commissionPercent?: number;
}

export class UpdateStylistDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptionalImageUrl()
  avatarUrl?: string | null;

  @IsOptionalImageUrl()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** Only affects appointments completed from now on; past income keeps the percent it had. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  commissionPercent?: number;
}

export class StylistServiceEntryDto {
  @IsString()
  serviceId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  overridePriceToman?: number | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  overrideDurationMinutes?: number | null;

  /** The stylist's share for this service; null/omitted = their default commissionPercent. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  commissionPercent?: number | null;
}

export class SetStylistServicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StylistServiceEntryDto)
  services!: StylistServiceEntryDto[];
}

export class UpdateStylistServiceOverrideDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  overridePriceToman?: number | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  overrideDurationMinutes?: number | null;

  /** null = follow the service's setting. */
  @IsOptional()
  @IsBoolean()
  overrideRebookReminderEnabled?: boolean | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  overrideRebookReminderDays?: number | null;
}

export class UpdateOwnStylistDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptionalImageUrl()
  avatarUrl?: string | null;

  @IsOptionalImageUrl()
  coverImageUrl?: string | null;
}

export class WorkingHourEntryDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsInt()
  @Min(0)
  startMinute!: number;

  @IsInt()
  @Min(0)
  endMinute!: number;
}

export class SetWorkingHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHourEntryDto)
  hours!: WorkingHourEntryDto[];
}

export class CreateTimeOffDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
