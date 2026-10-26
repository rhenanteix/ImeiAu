import { db } from "@/lib/db";
import { AppError } from "@/lib/domain";

interface SplitConfig {
  buyerPaidCents: number;
  commissionRateBps: number;
  merchantId: string;
}

interface SplitResult {
  commissionCents: number;
  merchantPayoutCents: number;
  split: {
    receiverId: string;
    amountCents: number;
    feeCents?: number;
  }[];
}

export class PaymentSplitService {
  /**
   * Calculate split amounts
   * Flow: Buyer pays full matched price -> SaaS takes commission -> Merchant gets remainder
   */
  static calculateSplit(config: SplitConfig): SplitResult {
    const { buyerPaidCents, commissionRateBps } = config;
    
    // Commission = (buyerPaidCents * commissionRateBps) / 10000
    const commissionCents = Math.round((buyerPaidCents * commissionRateBps) / 10000);
    const merchantPayoutCents = buyerPaidCents - commissionCents;

    // For gateway split (e.g., Asaas/Pagar.me/Mercado Pago)
    // SaaS receives commission, merchant receives remainder
    return {
      commissionCents,
      merchantPayoutCents,
      split: [
        {
          receiverId: "SAAS_PLATFORM", // Our platform account
          amountCents: commissionCents,
        },
        {
          receiverId: config.merchantId,
          amountCents: merchantPayoutCents,
        },
      ],
    };
  }

  /**
   * Create payment intent for buyer to pay the lot
   */
  static async createLotPayment(lotId: string) {
    return await db.$transaction(async (tx) => {
      const lot = await tx.b2BLot.findUniqueOrThrow({
        where: { id: lotId },
        include: {
          buyer: true,
          tradeIns: {
            include: {
              store: true,
            },
          },
        },
      });

      if (lot.status !== "open") {
        throw new AppError(400, "Lote não está aberto para pagamento");
      }

      if (lot.tradeIns.length === 0) {
        throw new AppError(400, "Lote vazio");
      }

      const buyer = lot.buyer;
      if (!buyer || buyer.status !== "approved") {
        throw new AppError(400, "Comprador não aprovado");
      }

      const totalAmount = lot.totalValueCents;
      const commissionRateBps = buyer.commissionRateBps;
      const split = this.calculateSplit({
        buyerPaidCents: totalAmount,
        commissionRateBps,
        merchantId: lot.tradeIns[0].storeId, // simplified - in production handle per-merchant
      });

      // Create split transaction record
      const splitTransaction = await tx.b2BSplitTransaction.create({
        data: {
          lotId: lot.id,
          buyerId: buyer.id,
          paymentProvider: "asaas", // configurable
          buyerPaidCents: totalAmount,
          commissionCents: split.commissionCents,
          merchantPayoutCents: split.merchantPayoutCents,
          commissionRateBps,
          status: "pending",
          splitConfig: { ...split },
        },
      });

      // In production, integrate with payment gateway
      // Example: Asaas/Pagar.me/Mercado Pago with split
      // For now, return payment details
      return {
        splitTransactionId: splitTransaction.id,
        amount: totalAmount,
        commission: split.commissionCents,
        merchantPayout: split.merchantPayoutCents,
        paymentUrl: `https://pagamento.exemplo.com/pay/${splitTransaction.id}`,
        qrCode: "00020126580014br.gov.bcb.pix...", // mock
        status: "pending",
        split,
      };
    });
  }

  /**
   * Process payment webhook from gateway
   */
  static async processPaymentWebhook(data: {
    paymentIntentId: string;
    status: "paid" | "failed";
    chargeId?: string;
  }) {
    return await db.$transaction(async (tx) => {
      const splitTx = await tx.b2BSplitTransaction.findFirst({
        where: { paymentIntentId: data.paymentIntentId },
        include: { lot: true },
      });

      if (!splitTx) {
        throw new AppError(404, "Transação não encontrada");
      }

      if (data.status === "paid") {
        // Mark as paid
        await tx.b2BSplitTransaction.update({
          where: { id: splitTx.id },
          data: {
            status: "paid",
            chargeId: data.chargeId,
            paidAt: new Date(),
            webhookData: data,
          },
        });

        // Execute split - transfer to merchant and keep commission
        // In production, call gateway API to execute split
        await tx.b2BSplitTransaction.update({
          where: { id: splitTx.id },
          data: {
            status: "split_completed",
            splitCompletedAt: new Date(),
          },
        });

        // Close the lot
        await tx.b2BLot.update({
          where: { id: splitTx.lotId },
          data: {
            status: "settled",
            settledAt: new Date(),
          },
        });

        // Update trade-ins to completed
        await tx.tradeIn.updateMany({
          where: { lotId: splitTx.lotId },
          data: {
            status: "completed",
          },
        });

        return { success: true, lotId: splitTx.lotId };
      } else {
        await tx.b2BSplitTransaction.update({
          where: { id: splitTx.id },
          data: {
            status: "failed",
            webhookData: data,
          },
        });
        return { success: false };
      }
    });
  }

  /**
   * Generate shipping label with buyer's address (skip merchant warehouse)
   */
  static async generateBuyerShippingLabel(tradeInId: string) {
    const tradeIn = await db.tradeIn.findUniqueOrThrow({
      where: { id: tradeInId },
      include: {
        b2bBuyer: true,
        store: true,
      },
    });

    if (!tradeIn.b2bBuyerId || !tradeIn.b2bBuyer) {
      throw new AppError(400, "Trade-in não está atribuído a um comprador B2B");
    }

    if (tradeIn.status !== "sent_to_buyer") {
      throw new AppError(400, "Status inválido para gerar etiqueta");
    }

    // In production, integrate with shipping provider (Correios/Melhor Envio)
    // Generate label directly to buyer's address
    const buyerAddress = tradeIn.b2bBuyer.address as any;

    return {
      trackingCode: `BUYER-${Date.now()}`,
      carrier: "MELHOR_ENVIO",
      labelUrl: `https://etiquetas.exemplo.com/buyer/${tradeInId}.pdf`,
      destination: buyerAddress,
      message: "Etiqueta gerada com endereço do comprador B2B",
    };
  }
}
