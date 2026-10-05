import { IsOptional, IsString, Length, MaxLength, MinLength } from "class-validator";

export class CompletePasswordSetupDto {
  @IsString()
  @MaxLength(100)
  token!: string;

  // Same rule as registration.
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  /** The SMS code sent to the account's phone (POST auth/password-setup/:token/code); required when it has one. */
  @IsOptional()
  @IsString()
  @Length(5, 5, { message: "Enter the 5-digit code sent to your phone" })
  code?: string;
}
