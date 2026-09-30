import { applyDecorators } from "@nestjs/common";
import { ServiceLocation } from "@appointment-scheduling/database";
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsString, MaxLength, ValidateIf } from "class-validator";

/**
 * Where an independent stylist works: one or more of IN_SALON / STUDIO / HOME / CLIENT_HOME.
 * May be left out, but never null (the list column can't be; a 400 rather than a database error).
 */
export function IsServiceLocations() {
  return applyDecorators(
    ValidateIf((_, v) => v !== undefined),
    IsArray(),
    ArrayMinSize(1),
    ArrayMaxSize(4),
    ArrayUnique(),
    IsEnum(ServiceLocation, { each: true }),
  );
}

/** The salon an independent stylist works in (IN_SALON), free text; blank or null clears it. */
export function IsHostSalonName() {
  return applyDecorators(
    Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value)),
    ValidateIf((_, v) => v !== null && v !== undefined),
    IsString(),
    MaxLength(100),
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
