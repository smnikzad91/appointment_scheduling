import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { GalleryController } from "./gallery.controller.js";
import { GalleryService } from "./gallery.service.js";

@Module({
  imports: [SalonsModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
