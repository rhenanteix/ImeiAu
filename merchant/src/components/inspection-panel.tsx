"use client";
import { useState } from "react";
import { api, type Detail } from "@/lib/client";
import { money } from "@/lib/domain";
import { useResource, Loading, Modal, Notice, Badge } from "./shared";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function InspectionPanel({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const resource = useResource<Detail>("merchant/tradeins/" + id);
  const [checklist, setChecklist] = useState({
      powersOn: false,
      imeiMatches: false,
      conditionMatches: false,
    }),
    [notes, setNotes] = useState(""),
    [amount, setAmount] = useState(""),
    [decision, setDecision] = useState<"approve" | "counteroffer" | "reject">(
      "approve",
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const row = resource.data;
  async function transition(status: string) {
    setBusy(true);
    try {
      await api(`merchant/tradeins/${id}/status`, "PATCH", {
        status,
        version: row!.version,
      });
      resource.reload();
      onSaved();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Análise do aparelho" onClose={onClose}>
      {!row ? (
        <Loading error={resource.error} retry={resource.reload} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold">
                {row.device.model}{" "}
                <span className="text-muted-foreground">
                  {row.device.storage}
                </span>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.customer.name} · {row.customer.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Protocolo {row.id}
              </p>
            </div>
            <Badge status={row.status} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Cotação original</p>
              <strong className="text-2xl">{money(row.estimatedCents)}</strong>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Modalidade</p>
              <strong className="text-sm">
                {row.mode === "instant_coupon"
                  ? "Cupom instantâneo"
                  : "Pós-inspeção"}
              </strong>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.preauthorizationStatus
                  ? `Pré-autorização: ${row.preauthorizationStatus}`
                  : "Liberação após aprovação"}
              </p>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="font-semibold">Declarado pelo cliente</h3>
            <p className="mt-3 text-sm">
              IMEI: <strong>{row.imei || "Não informado"}</strong>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.imei
                ? row.imeiChecked
                  ? "Blacklist consultada na IMEI.info. Confira também o IMEI físico durante a inspeção."
                  : "Formato validado; blacklist ainda não consultada. Confira o identificador no aparelho durante a inspeção."
                : "Solicite o IMEI e confira no aparelho antes de aprovar a troca."}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["powers_on", "Aparelho liga"],
                ["screen_intact", "Tela intacta"],
                ["battery_ok", "Bateria em boas condições"],
              ].map(([key, label]) => (
                <div key={key} className="flex justify-between">
                  <dt>{label}</dt>
                  <dd className="font-medium">
                    {row.condition[key] ? "Sim" : "Não"}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Margem: {money(row.pricingSnapshot.margin_cents)} · Frete
              descontado: {money(row.pricingSnapshot.freight_cents)}
            </p>
          </Card>
          {row.status === "pending_shipping" && (
            <Button disabled={busy} onClick={() => transition("shipped")}>
              Registrar envio / em trânsito
            </Button>
          )}
          {row.status === "shipped" && (
            <Button disabled={busy} onClick={() => transition("inspecting")}>
              Confirmar recebimento e iniciar vistoria
            </Button>
          )}
          {row.status === "inspecting" && (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setMessage("");
                try {
                  await api(`merchant/tradeins/${id}/inspection`, "POST", {
                    version: row.version,
                    decision,
                    checklist,
                    notes,
                    ...(decision === "counteroffer"
                      ? { amountCents: Math.round(Number(amount) * 100) }
                      : {}),
                  });
                  setMessage(
                    "Decisão registrada. Evento de integração enfileirado.",
                  );
                  resource.reload();
                  onSaved();
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <fieldset className="rounded-xl border border-border bg-white p-4">
                <legend className="px-2 font-semibold">
                  Checklist técnico
                </legend>
                {[
                  ["powersOn", "O aparelho liga normalmente?"],
                  ["imeiMatches", "O IMEI confere com a nota apresentada?"],
                  ["conditionMatches", "A condição confere com o declarado?"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="my-3 flex items-center gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checklist[key as keyof typeof checklist]}
                      onChange={(e) =>
                        setChecklist({ ...checklist, [key]: e.target.checked })
                      }
                      className="h-4 w-4 accent-emerald-800"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <div>
                <label className="field" htmlFor="decision">
                  Decisão
                </label>
                <select
                  id="decision"
                  value={decision}
                  onChange={(e) =>
                    setDecision(e.target.value as typeof decision)
                  }
                >
                  <option value="approve">Aprovar e liberar crédito</option>
                  <option value="counteroffer">Enviar contraproposta</option>
                  <option value="reject">Rejeitar e devolver</option>
                </select>
              </div>
              {decision === "counteroffer" && (
                <div>
                  <label className="field" htmlFor="counter-value">
                    Valor final proposto (R$)
                  </label>
                  <Input
                    id="counter-value"
                    type="number"
                    min="0.01"
                    max={(row.estimatedCents - 1) / 100}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    O crédito só será liberado após o aceite do cliente.
                  </p>
                </div>
              )}
              <div>
                <label className="field" htmlFor="notes">
                  Parecer técnico {decision !== "approve" && "(obrigatório)"}
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  maxLength={2000}
                  required={decision !== "approve"}
                  minLength={decision === "approve" ? 0 : 10}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Descreva o resultado da inspeção…"
                />
              </div>
              <Button
                variant={decision === "reject" ? "destructive" : "default"}
                disabled={
                  busy ||
                  (decision === "approve" &&
                    !Object.values(checklist).every(Boolean))
                }
              >
                {busy
                  ? "Registrando…"
                  : decision === "approve"
                    ? "Confirmar aprovação"
                    : decision === "counteroffer"
                      ? "Enviar contraproposta"
                      : "Confirmar rejeição e devolução"}
              </Button>
            </form>
          )}
          {row.status === "counteroffered" && (
            <Card className="p-4">
              <p className="text-sm">
                Aguardando aceite do cliente. Acesse a mensagem simulada em
                “Eventos”.
              </p>
              {row.counteroffers.some(
                (o) => new Date(o.expiresAt) < new Date(),
              ) && (
                <Button
                  className="mt-3"
                  variant="outline"
                  disabled={busy}
                  onClick={() => transition("reopen_inspection")}
                >
                  Retomar análise da proposta expirada
                </Button>
              )}
            </Card>
          )}
          {(row.status === "approved" || row.status === "rejected") && (
            <Card className="space-y-2 p-4">
              <h3 className="font-semibold">
                {row.status === "approved"
                  ? "Operação aprovada"
                  : "Devolução solicitada"}
              </h3>
              {row.returnShippingCode && (
                <Button asChild variant="outline">
                  <a
                    href={`/api/merchant/tradeins/${row.id}/return-label`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visualizar etiqueta de devolução
                  </a>
                </Button>
              )}
              {row.finalCents !== null && (
                <p>Valor final: {money(row.finalCents)}</p>
              )}
              {[row.couponCode, row.payoutReference, row.returnShippingCode]
                .filter(Boolean)
                .map((code) => (
                  <code className="block break-all text-sm" key={code}>
                    {code}
                  </code>
                ))}
              <p className="text-xs text-muted-foreground">
                Códigos de demonstração; não representam crédito ou postagem
                real.
              </p>
            </Card>
          )}
          {row.inspections.length > 0 && (
            <div>
              <h3 className="font-semibold">Histórico de vistoria</h3>
              {row.inspections.map((i) => (
                <p key={i.id} className="mt-2 text-sm text-muted-foreground">
                  {new Date(i.createdAt).toLocaleString("pt-BR")} · {i.decision}{" "}
                  · {i.notes || "Sem observações"}
                </p>
              ))}
            </div>
          )}
          <Notice message={message} />
        </div>
      )}
    </Modal>
  );
}
