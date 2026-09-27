import { IsOptional, IsString, Length } from "class-validator";

export class RequestOtpDto {
  @IsString()
  phone!: string;
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
