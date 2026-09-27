import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, Matches } from "class-validator";

export class JoinWaitlistDto {
  /** Salon-local day, "YYYY-MM-DD". */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date" })
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  serviceIds!: string[];

  /** A specific stylist, or any stylist when omitted. */
  @IsOptional()
  @IsString()
  stylistId?: string;
}
