"use client";
import { createElement } from "react";
import Script from "next/script";
export function Simulator({ storeId = "demo", label = "Avaliar meu celular ↗" }: { storeId?: string; label?: string }) {
  return <><Script src="/widget.js" />{createElement("trade-in-widget", { "store-id": storeId, label })}</>;
}
