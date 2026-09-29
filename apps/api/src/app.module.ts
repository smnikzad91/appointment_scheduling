import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health.controller.js';
import { ErrorLogModule } from './error-log/error-log.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SalonsModule } from './salons/salons.module.js';
import { ServiceCategoriesModule } from './service-categories/service-categories.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { StylistsModule } from './stylists/stylists.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { GalleryModule } from './gallery/gallery.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AccountingModule } from './accounting/accounting.module.js';
import { ShowcaseModule } from './showcase/showcase.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';
import { SmsModule } from './sms/sms.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ErrorLogModule,
    AuthModule,
    SalonsModule,
    ServiceCategoriesModule,
    CatalogModule,
    StylistsModule,
    AppointmentsModule,
    ReviewsModule,
    AvailabilityModule,
    GalleryModule,
    NotificationsModule,
    AccountingModule,
    ShowcaseModule,
    FavoritesModule,
    WaitlistModule,
    SmsModule,
    SubscriptionsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
