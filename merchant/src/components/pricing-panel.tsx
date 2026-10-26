"use client";
import { useState } from "react";
import { Plus, Search, Pencil, Archive } from "lucide-react";
import { api, type Device, type Rule } from "@/lib/client";
import { money } from "@/lib/domain";
import { useResource, Loading, Modal, Notice } from "./shared";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
function DeviceEditor({
  device,
  onClose,
  onSaved,
}: {
  device: Device | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <Modal
      title={device ? "Editar aparelho" : "Adicionar aparelho"}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const form = new FormData(e.currentTarget);
          const body = {
            brand: String(form.get("brand")),
            model: String(form.get("model")),
            storage: String(form.get("storage")),
            basePriceCents: Math.round(Number(form.get("price")) * 100),
            active: form.get("active") === "on",
            ...(device ? { version: device.version } : {}),
          };
          try {
            await api(
              `merchant/devices${device ? "/" + device.id : ""}`,
              device ? "PATCH" : "POST",
              body,
            );
            onSaved();
            onClose();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {[
          ["brand", "Marca", device?.brand],
          ["model", "Modelo", device?.model],
          ["storage", "Armazenamento", device?.storage],
        ].map(([name, label, value]) => (
          <div key={name}>
            <label className="field" htmlFor={name}>
              {label}
            </label>
            <Input
              id={name}
              name={name}
              defaultValue={value}
              required
              maxLength={name === "model" ? 100 : name === "brand" ? 60 : 30}
            />
          </div>
        ))}
        <div>
          <label className="field" htmlFor="price">
            Preço base (R$)
          </label>
          <Input
            id="price"
            name="price"
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            defaultValue={device ? device.basePriceCents / 100 : ""}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={device?.active ?? true}
          />
          Disponível no widget
        </label>
        <Notice message={message} />
        <Button disabled={busy}>
          {busy ? "Salvando…" : "Salvar aparelho"}
        </Button>
      </form>
    </Modal>
  );
}
function RuleEditor({ rule, onSaved }: { rule: Rule; onSaved: () => void }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="rounded-lg border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api(`merchant/rules/${rule.id}`, "PATCH", {
            deductionBps: Math.round(
              Number(new FormData(e.currentTarget).get("deduction")) * 100,
            ),
            version: rule.version,
          });
          onSaved();
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={rule.id} className="field">
        {rule.label}
      </label>
      <div className="flex gap-2">
        <Input
          aria-label={`${rule.label} (%)`}
          id={rule.id}
          name="deduction"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={rule.deductionBps / 100}
          required
        />
        <Button variant="outline" disabled={busy}>
          Salvar %
        </Button>
      </div>
      <Notice message={message} />
    </form>
  );
}
export function PricingPanel() {
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Device | null | undefined>(),
    [message, setMessage] = useState(""),
    [archive, setArchive] = useState<Device | null>(null),
    [busy, setBusy] = useState(false);
  const devices = useResource<Device[]>(
      "merchant/devices?q=" + encodeURIComponent(search),
    ),
    rules = useResource<Rule[]>("merchant/rules");
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                aria-label="Buscar aparelho"
                placeholder="Marca, modelo ou capacidade…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">Buscar</Button>
          </form>
          <Button onClick={() => setEditing(null)}>
            <Plus />
            Adicionar aparelho
          </Button>
        </div>
        <Notice message={message} />
        {!devices.data ? (
          <Loading error={devices.error} retry={devices.reload} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Aparelho</th>
                  <th>Marca</th>
                  <th>Capacidade</th>
                  <th>Preço base</th>
                  <th>Disponibilidade</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.data.map((d) => (
                  <tr key={d.id}>
                    <td className="font-semibold">{d.model}</td>
                    <td>{d.brand}</td>
                    <td>{d.storage}</td>
                    <td>{money(d.basePriceCents)}</td>
                    <td>
                      <span
                        className={
                          d.active
                            ? "text-emerald-700"
                            : "text-muted-foreground"
                        }
                      >
                        {d.active ? "Ativo" : "Arquivado"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          aria-label={`Editar ${d.model} ${d.storage}`}
                          onClick={() => setEditing(d)}
                        >
                          <Pencil />
                        </Button>
                        {d.active && (
                          <Button
                            variant="ghost"
                            aria-label={`Arquivar ${d.model} ${d.storage}`}
                            onClick={() => setArchive(d)}
                          >
                            <Archive />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {devices.data.length === 0 && (
              <p className="p-10 text-center text-muted-foreground">
                Nenhum aparelho encontrado.
              </p>
            )}
          </div>
        )}
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Regras de abatimento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aplicadas quando o cliente responde “não”. Percentuais somados sobre o
          preço base, limitados a 100%.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {rules.data ? (
            rules.data.map((rule) => (
              <RuleEditor
                key={`${rule.id}-${rule.version}`}
                rule={rule}
                onSaved={() => {
                  rules.reload();
                  setMessage("Regra atualizada.");
                }}
              />
            ))
          ) : (
            <Loading error={rules.error} retry={rules.reload} />
          )}
        </div>
      </Card>
      {editing !== undefined && (
        <DeviceEditor
          device={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            devices.reload();
            setMessage("Aparelho salvo.");
          }}
        />
      )}
      {archive && (
        <Modal title="Arquivar aparelho?" onClose={() => setArchive(null)}>
          <p className="mb-5">
            {archive.model} {archive.storage} deixará de aparecer em novas
            cotações. O histórico será preservado.
          </p>
          <Notice message={message} />
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`merchant/devices/${archive.id}`, "DELETE", {
                  version: archive.version,
                });
                setArchive(null);
                devices.reload();
                setMessage("Aparelho arquivado.");
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirmar arquivamento
          </Button>
        </Modal>
      )}
    </div>
  );
}
