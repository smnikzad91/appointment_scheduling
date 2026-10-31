import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString, Length, MaxLength, MinLength } from "class-validator";
import type { ClientGender, SalonKind, ServiceLocation } from "@appointment-scheduling/database";
import { IsHostSalonName, IsServiceArea, IsServiceLocations } from "../../salons/dto/service-locations.js";
import { SIGNUP_SOURCES, type SignupSource } from "../signup-source.js";

export class RegisterSalonOwnerDto {
  // Owner account
  @IsString()
  phone!: string;

  /** The SMS code sent to this phone (POST auth/otp/request with purpose "register"). */
  @IsString()
  @Length(5, 5, { message: "Enter the 5-digit code sent to your phone" })
  code!: string;

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

  /** SALON (default) = a salon owner; INDEPENDENT = a freelance stylist signing up their own business. */
  @IsOptional()
  @IsIn(["SALON", "INDEPENDENT"])
  kind?: SalonKind;

  /** Who they serve: MEN (آقایان) or WOMEN (بانوان). The web and app forms require it; optional for older app versions. */
  @IsOptional()
  @IsIn(["MEN", "WOMEN"])
  clientGender?: ClientGender;

  /** INDEPENDENT: where they work (required, one or more). */
  @IsServiceLocations()
  serviceLocations?: ServiceLocation[];

  /** INDEPENDENT: areas covered by home visits. */
  @IsServiceArea()
  serviceArea?: string | null;

  /** INDEPENDENT working in a salon (IN_SALON): that salon's name. */
  @IsHostSalonName()
  hostSalonName?: string | null;

  // Salon (for an independent stylist: their business / display name)
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

  /** «از کجا با ما آشنا شدید؟» (the web form requires it; optional for older app versions). */
  @IsOptional()
  @IsIn(SIGNUP_SOURCES)
  signupSource?: SignupSource;

  /** Their own words with OTHER. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  signupSourceNote?: string;
}
