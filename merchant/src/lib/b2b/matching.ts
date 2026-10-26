import { db } from "@/lib/db";
import { AppError } from "@/lib/domain";
import type { TradeIn, B2BBuyer, B2BOffer, Device, Store } from "@/generated/prisma/client";

interface MatchResult {
  tradeInId: string;
  buyerId: string;
  offerId: string;
  matchedPriceCents: number;
  score: number;
}

interface TradeInForMatching extends TradeIn {
  device: Device;
  store: Store;
}

interface OfferWithBuyer extends B2BOffer {
  buyer: B2BBuyer;
}

export class B2BMatchingEngine {
  /**
   * Matches an approved TradeIn with the best B2B buyer offer
   * Considers: model/brand match, condition criteria, price, buyer status
   */
  static async findBestMatch(tradeIn: TradeInForMatching): Promise<MatchResult | null> {
    // Only match approved trade-ins
    if (tradeIn.status !== "approved") {
      return null;
    }

    // Don't re-match
    if (tradeIn.b2bBuyerId) {
      return null;
    }

    const condition = tradeIn.condition as Record<string, boolean>;
    const device = tradeIn.device;

    // Find active offers that match the device
    const offers = await db.b2BOffer.findMany({
      where: {
        status: "active",
        brand: device.brand,
        model: device.model,
        OR: [
          { storage: null },
          { storage: device.storage },
        ],
      },
      include: {
        buyer: true,
      },
    });

    const validOffers: Array<{
      offer: OfferWithBuyer;
      priceCents: number;
      score: number;
    }> = [];

    for (const offer of offers) {
      // Check buyer status
      if (offer.buyer.status !== "approved") {
        continue;
      }

      // Check offer expiry
      if (offer.expiresAt && offer.expiresAt < new Date()) {
        continue;
      }

      // Check if trade-in price is within buyer's max price
      if (tradeIn.estimatedCents > offer.maxPriceCents) {
        continue;
      }

      // Check condition criteria match
      const criteria = offer.conditionCriteria as Record<string, any>;
      let conditionMatch = true;
      
      if (criteria.require_powers_on !== undefined && criteria.require_powers_on !== condition.powers_on) {
        conditionMatch = false;
      }
      if (criteria.require_screen_intact !== undefined && criteria.require_screen_intact !== condition.screen_intact) {
        conditionMatch = false;
      }
      if (criteria.require_battery_ok !== undefined && criteria.require_battery_ok !== condition.battery_ok) {
        conditionMatch = false;
      }

      if (!conditionMatch) {
        continue;
      }

      // Calculate score (higher is better) - prefer higher price offers and faster response
      const priceScore = (offer.maxPriceCents / tradeIn.estimatedCents) * 100; // closer to max price is better for buyer? Or we want best price for merchant
      // For merchant, we want highest price the buyer is willing to pay
      const score = offer.maxPriceCents; // Higher max price = better match for merchant

      validOffers.push({
        offer,
        priceCents: offer.maxPriceCents, // buyer pays their max offer price
        score,
      });
    }

    if (validOffers.length === 0) {
      return null;
    }

    // Sort by highest price first
    validOffers.sort((a, b) => b.score - a.score);

    const best = validOffers[0];

    return {
      tradeInId: tradeIn.id,
      buyerId: best.offer.buyerId,
      offerId: best.offer.id,
      matchedPriceCents: best.priceCents,
      score: best.score,
    };
  }

  /**
   * Executes the match - assigns trade-in to buyer and creates lot if needed
   */
  static async executeMatch(match: MatchResult): Promise<TradeIn> {
    return await db.$transaction(async (tx) => {
      const tradeIn = await tx.tradeIn.findUniqueOrThrow({
        where: { id: match.tradeInId },
        include: { lot: true },
      });

      // Check if already matched
      if (tradeIn.b2bBuyerId) {
        throw new AppError(409, "Trade-in já foi repassado");
      }

      // Find or create open lot for this buyer
      let lot = await tx.b2BLot.findFirst({
        where: {
          buyerId: match.buyerId,
          status: "open",
        },
      });

      if (!lot) {
        lot = await tx.b2BLot.create({
          data: {
            buyerId: match.buyerId,
            status: "open",
          },
        });
      }

      // Update trade-in
      const updated = await tx.tradeIn.update({
        where: { id: match.tradeInId },
        data: {
          b2bBuyerId: match.buyerId,
          b2bOfferId: match.offerId,
          lotId: lot.id,
          matchedAt: new Date(),
          status: "sent_to_buyer",
        },
      });

      // Update lot totals
      await tx.b2BLot.update({
        where: { id: lot.id },
        data: {
          totalDevices: { increment: 1 },
          totalValueCents: { increment: match.matchedPriceCents },
        },
      });

      return updated;
    });
  }

  /**
   * Auto-match all approved trade-ins that aren't matched yet
   */
  static async autoMatchApproved(): Promise<MatchResult[]> {
    const approvedTradeIns = await db.tradeIn.findMany({
      where: {
        status: "approved",
        b2bBuyerId: null,
      },
      include: {
        device: true,
        store: true,
      },
    });

    const results: MatchResult[] = [];

    for (const tradeIn of approvedTradeIns) {
      const match = await this.findBestMatch(tradeIn as TradeInForMatching);
      if (match) {
        try {
          await this.executeMatch(match);
          results.push(match);
        } catch (error) {
          console.error(`Failed to execute match for trade-in ${tradeIn.id}:`, error);
        }
      }
    }

    return results;
  }
}
