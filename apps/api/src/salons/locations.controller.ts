import { Controller, Get, Header } from "@nestjs/common";
import { IRAN_PROVINCES } from "@appointment-scheduling/iran-locations";

/** Iran's provinces and counties, for clients without the shared package (e.g. the Android apps). */
@Controller("locations")
export class LocationsController {
  @Get("provinces")
  @Header("Cache-Control", "public, max-age=86400")
  provinces() {
    return IRAN_PROVINCES;
  }
}
