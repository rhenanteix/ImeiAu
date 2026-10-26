ALTER TABLE "Store" ADD CONSTRAINT "store_margin_range" CHECK ("marginBps" BETWEEN 0 AND 10000), ADD CONSTRAINT "store_freight_nonnegative" CHECK ("freightCents" BETWEEN 0 AND 100000000), ADD CONSTRAINT "store_payout_mode" CHECK ("payoutMethod" IN ('coupon', 'pix') AND ("mode" <> 'instant_coupon' OR "payoutMethod" = 'coupon'));
ALTER TABLE "Device" ADD CONSTRAINT "device_price_positive" CHECK ("basePriceCents" BETWEEN 1 AND 100000000);
ALTER TABLE "ConditionRule" ADD CONSTRAINT "rule_range" CHECK ("deductionBps" BETWEEN 0 AND 10000), ADD CONSTRAINT "rule_criteria" CHECK ("criteria" IN ('powers_on','screen_intact','battery_ok'));
ALTER TABLE "TradeIn" ADD CONSTRAINT "trade_amounts" CHECK ("estimatedCents" > 0 AND ("finalCents" IS NULL OR "finalCents" > 0));
ALTER TABLE "Counteroffer" ADD CONSTRAINT "counteroffer_positive" CHECK ("amountCents" > 0), ADD CONSTRAINT "counteroffer_response" CHECK (("respondedAt" IS NULL AND "accepted" IS NULL) OR ("respondedAt" IS NOT NULL AND "accepted" IS NOT NULL));
ALTER TABLE "Membership" ADD CONSTRAINT "membership_role" CHECK ("role" IN ('owner','technician'));
