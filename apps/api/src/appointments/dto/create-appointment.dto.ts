import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, Matches, MaxLength } from "class-validator";

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

/** Staff booking a customer (phone call or walk-in): the stylist books themselves. */
export class CreateStylistAppointmentDto {
  @Matches(/^09\d{9}$/, { message: "Invalid phone number" })
  customerPhone!: string;

  /** Needed only when this phone has no account yet. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerLastName?: string;

  @IsArray()
  @ArrayMinSize(1)
  serviceIds!: string[];

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** The salon booking a customer (phone call or walk-in) with a specific stylist. */
export class CreateSalonAppointmentDto extends CreateStylistAppointmentDto {
  @IsString()
  stylistId!: string;
}

export class CustomerLookupQueryDto {
  @Matches(/^09\d{9}$/, { message: "Invalid phone number" })
  phone!: string;
}
