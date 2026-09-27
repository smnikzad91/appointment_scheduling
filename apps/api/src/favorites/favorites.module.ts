import { Module } from "@nestjs/common";
import { SalonsModule } from "../salons/salons.module.js";
import { FavoritesService } from "./favorites.service.js";
import { FavoritesController } from "./favorites.controller.js";

@Module({
  imports: [SalonsModule],
  providers: [FavoritesService],
  controllers: [FavoritesController],
})
export class FavoritesModule {}
