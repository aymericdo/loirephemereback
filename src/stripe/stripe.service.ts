import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  public readonly stripe: Stripe;
  private readonly apiVersion = '2024-12-18.acacia';

  constructor(
    // @Inject(MODULE_OPTIONS_TOKEN) private options: StripeModuleOptions,
    private apiKey: string,
  ) {
    this.stripe = new Stripe(this.apiKey, { apiVersion: this.apiVersion });
  }
}
