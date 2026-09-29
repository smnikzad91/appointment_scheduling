import { ExpenseCategory, PayoutMethod, StylistExpenseCategory } from "@appointment-scheduling/database";
import { Transform, Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { IsOptionalImageUrl } from "../../common/image-url.js";

/** Trims text before validation, so "   " fails @IsNotEmpty instead of being stored as "". */
const Trim = () => Transform(({ value }) => (typeof value === "string" ? value.trim() : value));

const MAX_AMOUNT = 2_000_000_000; // fits Postgres INTEGER; far above any single salon transaction

/** A reporting window: [from, to). Clients send the salon-local day/month boundaries as instants. */
export class PeriodQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  stylistId?: string;
}

export class AdjustChargeDto {
  /** What the customer actually paid (discount, extra service…). */
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  chargedToman!: number;

  /** Tip for the stylist on top of the price (all theirs). Omit to keep it; 0 or null clears it. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  tipToman?: number | null;
}

export class CreatePayoutDto {
  @IsString()
  stylistId!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amountToman!: number;

  @IsEnum(PayoutMethod)
  method!: PayoutMethod;

  /** Defaults to now. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amountToman!: number;

  /** Defaults to now. */
  @IsOptional()
  @IsDateString()
  spentAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  /** Optional uploaded receipt photo. */
  @IsOptionalImageUrl()
  receiptUrl?: string | null;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amountToman?: number;

  @IsOptional()
  @IsDateString()
  spentAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string | null;

  /** null removes the receipt. */
  @IsOptionalImageUrl()
  receiptUrl?: string | null;
}

export class PayoutQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  stylistId?: string;
}

// ── Stylist's own expenses ──

export class StylistExpenseQueryDto extends PeriodQueryDto {
  @IsOptional()
  @IsEnum(StylistExpenseCategory)
  category?: StylistExpenseCategory;

  /** 1-based. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateStylistExpenseDto {
  @IsEnum(StylistExpenseCategory)
  category!: StylistExpenseCategory;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amountToman!: number;

  @IsDateString()
  spentAt!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description!: string;

  /** Uploaded receipt photo; null clears it. */
  @IsOptionalImageUrl()
  receiptUrl?: string | null;
}

export class UpdateStylistExpenseDto {
  @IsOptional()
  @IsEnum(StylistExpenseCategory)
  category?: StylistExpenseCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amountToman?: number;

  @IsOptional()
  @IsDateString()
  spentAt?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description?: string;

  @IsOptionalImageUrl()
  receiptUrl?: string | null;
}
