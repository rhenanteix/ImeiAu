export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  if (response.status === 401) {
    window.location.assign("/login");
    throw new Error("Sessão expirada");
  }
  if (!response.ok)
    throw new Error(value.detail || "Não foi possível concluir");
  return value;
}
export type Settings = {
  id: string;
  name: string;
  platform: string;
  domain: string;
  mode: "instant_coupon" | "post_inspection";
  freightPayer: "store" | "customer";
  freightCents: number;
  marginBps: number;
  payoutMethod: "coupon" | "pix";
  version: number;
};
export type Device = {
  id: string;
  brand: string;
  model: string;
  storage: string;
  basePriceCents: number;
  active: boolean;
  version: number;
};
export type Rule = {
  id: string;
  label: string;
  criteria: string;
  deductionBps: number;
  version: number;
};
export type Event = {
  id: string;
  type: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};
export type Trade = {
  id: string;
  status: keyof typeof import("./domain").statusLabels;
  device: Device;
  customerName: string;
  estimatedCents: number;
  finalCents: number | null;
  createdAt: string;
  version: number;
  mode: string;
  couponCode: string | null;
  shippingCode: string;
  returnShippingCode: string | null;
  payoutReference: string | null;
  preauthorizationRef: string | null;
  preauthorizationStatus: string | null;
};
export type Detail = Trade & {
  imei: string | null;
  imeiChecked: boolean;
  customer: { name: string; email: string; phone: string };
  condition: Record<string, boolean>;
  pricingSnapshot: {
    margin_cents: number;
    freight_cents: number;
    base_price: number;
  };
  inspections: {
    id: string;
    decision: string;
    notes: string;
    createdAt: string;
  }[];
  events: Event[];
  counteroffers: { expiresAt: string }[];
};
