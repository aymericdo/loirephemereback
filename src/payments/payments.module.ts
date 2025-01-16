import { Module } from '@nestjs/common';
import { PaymentsController } from 'src/payments/payments.controller';
// import { PaymentsService } from 'src/payments/payments.service';
// import { ConfigService } from '@nestjs/config';
// import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  imports: [
    // StripeModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     apiKey: configService.get<string>('STRIPE_API_KEY'),
    //     options: {
    //       apiVersion: '2024-12-18.acacia',
    //     },
    //   }),
    // }),
  ],
  controllers: [PaymentsController],
  providers: [
    // PaymentsService,
  ],
})
export class PaymentsModule { }
