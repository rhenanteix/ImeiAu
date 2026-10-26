"use client";
import { Brand } from "@/components/brand";
import { useState } from "react";
import { WidgetPreview } from "./widget-preview";
import {
  LayoutDashboard,
  Smartphone,
  Settings,
  Radio,
  LogOut,
  ArrowUpRight,
  Package,
  ClipboardCheck,
  CheckCheck,
  Clock3,
  Code2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  api,
  type Settings as StoreSettings,
  type Trade,
  type Event,
} from "@/lib/client";
import { money, statusLabels } from "@/lib/domain";
import { useResource, Loading, Badge, Notice } from "./shared";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { SettingsPanel } from "./settings-panel";
import { PricingPanel } from "./pricing-panel";
import { InspectionPanel } from "./inspection-panel";
type Tab =
  "simulator" | "tradeins" | "pricing" | "settings" | "events" | "integration";
const tabs = [
  { id: "simulator", label: "Simulador", icon: Smartphone },
  { id: "tradeins", label: "Solicitações", icon: LayoutDashboard },
  { id: "pricing", label: "Tabela de preços", icon: Smartphone },
  { id: "settings", label: "Configurações", icon: Settings },
  { id: "integration", label: "Integração", icon: Code2 },
  { id: "events", label: "Eventos", icon: Radio },
] as const;
function IntegrationPanel({
  storeId,
  onPreview,
}: {
  storeId: string;
  onPreview: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const code = `<script defer src="${origin}/widget.js"></script>\n<trade-in-widget\n  api-url="${origin}"\n  store-id="${storeId}"\n  label="Troque seu celular por crédito">\n</trade-in-widget>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Código do widget</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cole esse código no HTML da sua loja, preferencialmente antes do
            &lt;/body&gt; ou no local onde quiser exibir o botão de trade-in.
          </p>
        </div>
        <Button onClick={copy}>{copied ? "Copiado!" : "Copiar código"}</Button>
      </div>
      <pre className="mt-5 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
        <code>{code}</code>
      </pre>
      <div className="mt-4 text-xs text-muted-foreground">
        <p>• api-url: {origin}</p>
        <p>• store-id: {storeId}</p>
      </div>
      <div className="mt-6 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Como testar</h3>
        <Button className="my-3" onClick={onPreview}>
          Abrir modo de teste
        </Button>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja o widget funcionando com o catálogo da sua loja, sem sair da
          plataforma.
        </p>
      </div>
    </Card>
  );
}
function EventsPanel() {
  const { data, error, reload } = useResource<Event[]>("merchant/events");
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Card className="p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Entregas de integração</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No modo mock, a mensagem fica registrada aqui e não é enviada.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload}>
            Atualizar
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("merchant/events/retry", "POST", {});
                setMessage("Reprocessamento agendado. Atualize em instantes.");
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Repetir falhas
          </Button>
        </div>
      </div>
      <Notice message={message} />
      {!data ? (
        <Loading error={error} retry={reload} />
      ) : (
        <div className="mt-5 space-y-3">
          {data.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">
              Nenhum evento registrado.
            </p>
          )}
          {data.map((event) => (
            <details
              key={event.id}
              className="rounded-lg border border-border p-4"
            >
              <summary className="text-sm">
                <strong>{event.type}</strong>
                <span className="ml-3 text-muted-foreground">
                  {event.status === "delivered"
                    ? "Processado"
                    : event.status === "failed"
                      ? "Falhou"
                      : "Na fila"}{" "}
                  · {event.attempts} tentativa(s)
                </span>
              </summary>
              <p className="mt-3 text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleString("pt-BR")} · {event.id}
              </p>
              {event.lastError && (
                <p className="my-2 text-sm text-red-700">{event.lastError}</p>
              )}
              {typeof event.payload.acceptanceUrl === "string" && (
                <a
                  href={event.payload.acceptanceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="my-3 inline-block text-sm font-semibold underline"
                >
                  Abrir aceite do cliente ↗
                </a>
              )}
              <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
function TradeinsPanel() {
  const [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null);
  const { data, error, reload } = useResource<{
    items: Trade[];
    total: number;
    page: number;
    counts: { status: string; _count: number }[];
  }>(`merchant/tradeins?status=${status}&page=${page}`);
  const count = (key: string) =>
    data?.counts.find((c) => c.status === key)?._count || 0;
  return (
    <>
      <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: "Total de solicitações",
            value: data?.counts.reduce((sum, c) => sum + c._count, 0) || 0,
            icon: Package,
          },
          {
            label: "Aguardando envio",
            value: count("pending_shipping"),
            icon: Clock3,
          },
          {
            label: "Em inspeção",
            value: count("inspecting"),
            icon: ClipboardCheck,
          },
          { label: "Aprovadas", value: count("approved"), icon: CheckCheck },
        ].map((metric) => (
          <Card key={metric.label} className="p-5">
            <div className="flex justify-between text-muted-foreground">
              <span className="text-xs">{metric.label}</span>
              <metric.icon className="h-4 w-4" />
            </div>
            <strong className="mt-4 block text-3xl font-medium">
              {data ? metric.value : "—"}
            </strong>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="font-semibold">Acompanhe cada troca</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Do primeiro envio à aprovação final.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Filtrar por status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os status</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={reload}>
              Atualizar
            </Button>
          </div>
        </div>
        {!data ? (
          <Loading error={error} retry={reload} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Cliente / aparelho</th>
                    <th>Recebida em</th>
                    <th>Cotação</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/40">
                      <td>
                        <strong className="block font-medium">
                          {row.customerName}
                        </strong>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {row.device.model} · {row.device.storage}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="whitespace-nowrap font-medium">
                        {money(row.finalCents ?? row.estimatedCents)}
                      </td>
                      <td>
                        <Badge status={row.status} />
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() => setSelected(row.id)}
                        >
                          Analisar
                          <ArrowUpRight />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.items.length === 0 && (
                <div className="p-12 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm">
                    Nenhuma solicitação neste status.
                  </p>
                  <a href="/" className="mt-2 inline-block text-sm underline">
                    Criar uma cotação no widget
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-4 text-xs text-muted-foreground">
              <span>
                {data.total} solicitação(ões) · Página {page}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={page * 20 >= data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
      {selected && (
        <InspectionPanel
          id={selected}
          onClose={() => setSelected(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}
export function Dashboard() {
  const [tab, setTab] = useState<Tab>("tradeins"),
    [logoutError, setLogoutError] = useState("");
  const {
    data: me,
    error,
    reload,
  } = useResource<{
    store: StoreSettings;
    user: { name: string; email: string };
    role: string;
    integrationMode: string;
  }>("merchant/me");
  const descriptions = {
    simulator:
      "Visualize seu widget e teste a experiência do cliente sem criar solicitações.",
    tradeins: "Cada aparelho, uma nova oportunidade.",
    pricing: "Preços e condições alinhados à sua operação.",
    settings: "Defina como sua loja transforma usados em crédito.",
    integration: "Gere o código do widget para integrar na sua loja.",
    events: "Acompanhe notificações, concessões e logística.",
  };
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="flex flex-col border-b border-border bg-white lg:sticky lg:top-0 lg:h-screen lg:border-r">
        <div className="px-7 py-7 text-4xl font-bold tracking-tighter">
          <Brand />
          <p className="mt-2 text-[10px] font-normal tracking-[.2em] text-muted-foreground">
            PAINEL DO LOJISTA
          </p>
        </div>
        <nav
          aria-label="Dashboard"
          className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col"
        >
          {tabs
            .filter(
              (t) =>
                me?.role !== "technician" ||
                t.id === "tradeins" ||
                t.id === "events" ||
                t.id === "simulator",
            )
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-3 text-sm ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
        </nav>
        <div className="mt-auto hidden p-5 lg:block">
          <div className="rounded-xl bg-muted p-4">
            <p className="text-sm font-semibold">Valor que circula.</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Gerencie o usado.
              <br />
              Crie espaço para o novo.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold"
              onClick={() => setTab("simulator")}
            >
              Gerar / testar widget <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-sm font-semibold">
              {me?.store.name[0] || "V"}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {me?.store.name || "Sua loja"}
              </p>
              <p className="text-xs text-muted-foreground">
                {me?.store.platform || "Merchant workspace"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-800 sm:block">
              Integrações simuladas
            </span>
            <Button
              variant="ghost"
              aria-label="Sair"
              onClick={async () => {
                try {
                  await authClient.signOut();
                  window.location.assign("/login");
                } catch {
                  setLogoutError("Não foi possível sair. Tente novamente.");
                }
              }}
            >
              <LogOut />
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-5 lg:p-10">
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[.17em] text-muted-foreground">
              Operação / {tabs.find((t) => t.id === tab)?.label}
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight">
              {tabs.find((t) => t.id === tab)?.label}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {descriptions[tab]}
            </p>
          </div>
          <Notice message={logoutError} />
          {!me ? (
            <Loading error={error} retry={reload} />
          ) : tab === "simulator" ? (
            <WidgetPreview store={me.store} />
          ) : tab === "tradeins" ? (
            <TradeinsPanel />
          ) : tab === "pricing" ? (
            <PricingPanel />
          ) : tab === "settings" ? (
            <SettingsPanel />
          ) : tab === "integration" ? (
            <IntegrationPanel
              storeId={me.store.id}
              onPreview={() => setTab("simulator")}
            />
          ) : (
            <EventsPanel />
          )}
          <p className="mt-8 text-center text-[10px] text-muted-foreground">
            IMEIAU · Ambiente de desenvolvimento · Valores e códigos
            demonstrativos
          </p>
        </main>
      </div>
    </div>
  );
}
