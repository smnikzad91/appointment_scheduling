import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AllExceptionsFilter } from "./all-exceptions.filter.js";
import { ErrorLogService } from "./error-log.service.js";

@Global()
@Module({
  providers: [ErrorLogService, { provide: APP_FILTER, useClass: AllExceptionsFilter }],
  exports: [ErrorLogService],
})
export class ErrorLogModule {}
