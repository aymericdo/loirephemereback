import { Injectable } from '@nestjs/common';
import { CommandDocument } from 'src/commands/schemas/command.schema';
import { StripeService } from 'src/stripe/stripe.service';

@Injectable()
export class PaymentsService {
  private readonly DOMAIN: 'http://localhost:4200' | 'https://oresto.app' = 'http://localhost:4200';
  private readonly stripeService: StripeService;

  constructor(
    private apiKey: string,
  ) {
    this.DOMAIN = process.env.ENVIRONMENT === 'dev' ?
      'http://localhost:4200' :
      'https://oresto.app'
    this.stripeService = new StripeService(this.apiKey)
  }

  async getCustomers() {
    return await this.stripeService.stripe.customers.list();
  }

  async getProducts() {
    return await this.stripeService.stripe.products.list();
  }

  async getProduct(id: string) {
    try {
      return await this.stripeService.stripe.products.retrieve(id);
    } catch (error) {
      return null
    }
  }

  async getPrices() {
    return await this.stripeService.stripe.prices.list();
  }

  async getPrice(id: string) {
    try {
      return await this.stripeService.stripe.prices.retrieve(id);
    } catch (error) {
      return null
    }
  }

  async getPriceFromProductId(productId: string) {
    return (await this.stripeService.stripe.prices.search({ query: `active:'true' AND product:'${productId}'` })).data[0];
  }

  async getSession(sessionId: string) {
    return await this.stripeService.stripe.checkout.sessions.retrieve(sessionId);
  }

  async expireSession(sessionId: string) {
    return await this.stripeService.stripe.checkout.sessions.expire(sessionId);
  }

  async buildSession(command: CommandDocument) {
    const prices = await this.buildPrices(command);

    const session = await this.stripeService.stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: Object.keys(prices).map((priceId) => ({
        price: priceId,
        quantity: prices[priceId],
      })),
      mode: 'payment',
      return_url: `${this.DOMAIN}/${command.restaurant.code}?sessionCommandId=${command.id}&sessionId={CHECKOUT_SESSION_ID}`,
    });

    return session;
  }

  private async buildPrices(command: CommandDocument): Promise<{ [key: string]: number }> {
    const totalCountByPriceId = {}

    for (let pastry of command.pastries) {
      // product section
      let product = await this.getProduct(pastry.id)
      if (!product) {
        product = await this.stripeService.stripe.products.create({
          name: pastry.name,
          id: pastry.id,
          default_price_data: {
            currency: 'eur',
            unit_amount: 100 * pastry.price,
          },
        });
      }

      // price section
      let price = await this.getPrice(product.default_price.toString());
      if (!price) {
        price = await this.stripeService.stripe.prices.create({
          currency: 'eur',
          unit_amount: 100 * pastry.price,
          product: product.id
        });
      } else if (price.unit_amount !== (100 * pastry.price)) {
        const newPrice = await this.stripeService.stripe.prices.create({
          currency: 'eur',
          unit_amount: 100 * pastry.price,
          product: product.id
        });

        await this.stripeService.stripe.products.update(product.id, {
          default_price: newPrice.id,
        });

        await this.stripeService.stripe.prices.update(price.id, {
          active: false,
        });

        price = newPrice;
      }

      if (totalCountByPriceId.hasOwnProperty(price.id)) {
        totalCountByPriceId[price.id] += 1
      } else {
        totalCountByPriceId[price.id] = 1
      }
    }

    return totalCountByPriceId;
  }
}