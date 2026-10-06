import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class RequestOtpDto {
  @IsString()
  phone!: string;

  /** "register": a code to verify a phone before creating an account — refused for a taken number. */
  @IsOptional()
  @IsIn(["login", "register"])
  purpose?: "login" | "register";
}

export class VerifyOtpDto {
  @IsString()
  phone!: string;

  @IsString()
  @Length(5, 5)
  code!: string;

  // Required only when this phone has no existing account yet.
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
