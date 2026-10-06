import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export const ADMIN_APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;

export class AdminAppointmentsQueryDto {
  @IsOptional()
  @IsIn(ADMIN_APPOINTMENT_STATUSES)
  status?: (typeof ADMIN_APPOINTMENT_STATUSES)[number];

  /** Customer name/phone, salon name, stylist name (contains; Persian digits allowed). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  salonId?: string;

  /** startAt in [from, to) */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
