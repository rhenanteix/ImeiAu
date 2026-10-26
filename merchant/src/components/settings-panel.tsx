"use client";
import { useState } from "react";
import { api, type Settings } from "@/lib/client";
import { useResource, Loading, Notice } from "./shared";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
function SettingsForm({
  initial,
  onSaved,
}: {
  initial: Settings;
  onSaved: () => void;
}) {
  const [settings, setSettings] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="max-w-4xl space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const {
            mode,
            freightPayer,
            freightCents,
            marginBps,
            payoutMethod,
            version,
          } = settings;
          const saved = await api<Settings>("merchant/settings", "PATCH", {
            mode,
            freightPayer,
            freightCents,
            marginBps,
            payoutMethod,
            version,
          });
          setSettings(saved);
          setMessage(
            "Configurações salvas. Novas cotações já usam estas regras.",
          );
          onSaved();
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Card className="p-6">
        <h2 className="text-lg font-semibold">
          Quando o cliente recebe o crédito?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A modalidade define a experiência do widget e a política de concessão.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            [
              "instant_coupon",
              "Cupom instantâneo",
              "Pré-autorização antes da emissão do cupom.",
            ],
            [
              "post_inspection",
              "Após a inspeção",
              "Crédito liberado após aprovação do técnico.",
            ],
          ].map(([value, title, description]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border p-5 ${settings.mode === value ? "border-primary bg-emerald-50" : "border-border"}`}
            >
              <input
                type="radio"
                name="mode"
                checked={settings.mode === value}
                onChange={() =>
                  setSettings({
                    ...settings,
                    mode: value as Settings["mode"],
                    payoutMethod:
                      value === "instant_coupon"
                        ? "coupon"
                        : settings.payoutMethod,
                  })
                }
                className="mr-2 accent-emerald-800"
              />
              <strong className="text-sm">{title}</strong>
              <span className="mt-2 block text-sm text-muted-foreground">
                {description}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Pré-autorização simulada no MVP. Nenhum cartão é solicitado ou
          cobrado.
        </p>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Frete e margem</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field" htmlFor="freight">
              Responsável pelo frete
            </label>
            <select
              id="freight"
              value={settings.freightPayer}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  freightPayer: e.target.value as Settings["freightPayer"],
                })
              }
            >
              <option value="store">Loja custeia</option>
              <option value="customer">Descontar da cotação</option>
            </select>
          </div>
          <div>
            <label className="field" htmlFor="freight-value">
              Frete de referência (R$)
            </label>
            <Input
              id="freight-value"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              value={settings.freightCents / 100}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  freightCents: Math.round(Number(e.target.value) * 100),
                })
              }
            />
          </div>
          <div>
            <label className="field" htmlFor="margin">
              Margem global (%)
            </label>
            <Input
              id="margin"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              value={settings.marginBps / 100}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  marginBps: Math.round(Number(e.target.value) * 100),
                })
              }
            />
          </div>
          <div>
            <label className="field" htmlFor="payout">
              Forma de liberação
            </label>
            <select
              id="payout"
              value={settings.payoutMethod}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  payoutMethod: e.target.value as Settings["payoutMethod"],
                })
              }
            >
              <option value="coupon">Cupom da loja</option>
              <option value="pix" disabled={settings.mode === "instant_coupon"}>
                PIX após inspeção (simulado)
              </option>
            </select>
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-muted p-4 text-sm">
          Preço base − abatimentos → margem sobre o valor ajustado → desconto de
          frete, quando escolhido. Solicitações existentes mantêm a cotação
          original.
        </div>
      </Card>
      <Notice message={message} />
      <Button disabled={busy}>
        {busy ? "Salvando…" : "Salvar configurações"}
      </Button>
    </form>
  );
}
export function SettingsPanel() {
  const { data, error, reload } = useResource<Settings>("merchant/settings");
  if (!data) return <Loading error={error} retry={reload} />;
  return <SettingsForm initial={data} onSaved={() => {}} />;
}
