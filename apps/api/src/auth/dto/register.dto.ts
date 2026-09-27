import { IsOptional, IsString, MinLength } from "class-validator";

// Public self-registration always creates a CUSTOMER account — role is never
// client-supplied here to avoid privilege escalation. STYLIST accounts are
// created by a salon owner (invite flow), PLATFORM_ADMIN is seeded directly.
export class RegisterDto {
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
}
