import { IsOptional, IsString, Length, MinLength } from "class-validator";

// Public self-registration always creates a CUSTOMER account — role is never
// client-supplied here to avoid privilege escalation. STYLIST accounts are
// created by a salon owner (invite flow), PLATFORM_ADMIN is seeded directly.
export class RegisterDto {
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
}
