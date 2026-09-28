import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterSalonOwnerDto {
  // Owner account
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  // Salon
  @IsString()
  salonName!: string;

  /** Province and county from packages/iran-locations (validated together in the service). */
  @IsString()
  province!: string;

  @IsString()
  city!: string;

  /** Street address — the rest of the location beyond province and county. */
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address!: string;

  /** The salon's pin on the map (required, inside Iran). */
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsString()
  salonPhone?: string;

  /** The plan picked on the pricing section / sign-up form; omitted = the recommended plan. */
  @IsOptional()
  @IsString()
  planId?: string;
}
