import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class CreateServiceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsInt()
  @IsPositive()
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  priceToman!: number;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceToman?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
