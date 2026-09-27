import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString } from "class-validator";

export class CreateAppointmentDto {
  @IsString()
  salonId!: string;

  // Omit to let the salon auto-assign the first available stylist who can perform all services.
  @IsOptional()
  @IsString()
  stylistId?: string;

  @IsArray()
  @ArrayMinSize(1)
  serviceIds!: string[];

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
