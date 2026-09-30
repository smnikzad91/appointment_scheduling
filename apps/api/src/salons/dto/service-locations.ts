import { applyDecorators } from "@nestjs/common";
import { ServiceLocation } from "@appointment-scheduling/database";
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

/** Where an independent stylist works: one or more of STUDIO / HOME / CLIENT_HOME. */
export function IsServiceLocations() {
  return applyDecorators(
    IsOptional(),
    IsArray(),
    ArrayMinSize(1),
    ArrayMaxSize(3),
    ArrayUnique(),
    IsEnum(ServiceLocation, { each: true }),
  );
}

/** Areas covered by home visits, free text; blank or null clears it. */
export function IsServiceArea() {
  return applyDecorators(
    Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value)),
    ValidateIf((_, v) => v !== null && v !== undefined),
    IsString(),
    MaxLength(200),
  );
}
