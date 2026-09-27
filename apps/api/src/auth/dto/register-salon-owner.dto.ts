import { IsOptional, IsString, MinLength } from "class-validator";

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

  @IsString()
  city!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  salonPhone?: string;
}
