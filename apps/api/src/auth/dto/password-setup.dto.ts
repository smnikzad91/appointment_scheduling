import { IsString, MaxLength, MinLength } from "class-validator";

export class CompletePasswordSetupDto {
  @IsString()
  @MaxLength(100)
  token!: string;

  // Same rule as registration.
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
