"use client";

import { useState } from "react";
import { Monitor, Smartphone, RotateCcw } from "lucide-react";
import type { Settings } from "@/lib/client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

export function WidgetPreview({ store }: { store: Settings }) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [revision, setRevision] = useState(0);
  const preview = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}body{margin:0;font:15px/1.6 Arial,sans-serif;color:#203b30;background:#fff}header{padding:20px 28px;border-bottom:1px solid #e0e6dc;display:flex;justify-content:space-between;gap:12px}header span{font-size:12px;color:#6c786f}main{padding:32px;max-width:1000px;margin:auto}.path{font-size:12px;color:#6c786f;margin-bottom:26px}.product{display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:center}.visual{min-height:300px;display:grid;place-items:center;background:#f1f3ed;border-radius:18px}.phone{width:125px;height:235px;background:linear-gradient(140deg,#657e6c,#203b30);border:5px solid #8b9e8b;border-radius:25px;display:grid;place-items:center;font-size:65px;color:#d5f78a;box-shadow:12px 16px 25px #203b3020}h1{font-size:30px;line-height:1.2;letter-spacing:-1px;margin:12px 0}small{color:#6c786f}.tag{font-size:11px;letter-spacing:.1em;color:#6c786f}.offer{padding:22px;border:1px solid #d9e5cc;border-radius:14px;background:#f8faf4;margin-top:24px}.offer p{margin:6px 0 18px;font-size:14px}.offer strong{font-size:16px}.note{font-size:12px;color:#6c786f;margin-top:25px}@media(max-width:600px){header{padding:16px}main{padding:20px}.product{grid-template-columns:1fr;gap:22px}.visual{min-height:190px}.phone{width:85px;height:155px;font-size:45px}h1{font-size:25px}}
    </style><script defer src="/widget.js"></script></head><body><header><strong>${escapeHtml(store.name)}</strong><span>Prévia da sua vitrine</span></header><main><div class="path">Loja / Smartphones / Sua próxima compra</div><div class="product"><div class="visual" aria-label="Ilustração de um celular"><div class="phone">↗</div></div><div><span class="tag">EXEMPLO DE PÁGINA DE PRODUTO</span><h1>Seu próximo smartphone</h1><p>Veja como o convite para trocar um usado pode aparecer na sua loja.</p><small>Produto ilustrativo · sem compra disponível</small><div class="offer"><strong>Seu celular usado vale crédito.</strong><p>Faça uma avaliação e descubra quanto ele pode valer na sua próxima compra.</p><trade-in-widget store-id="${escapeHtml(store.id)}" test-mode label="Troque seu celular por crédito"></trade-in-widget></div></div></div><p class="note">Modo de teste: os preços e regras são da sua loja. Nenhuma solicitação, cupom ou postagem será criada.</p></main></body></html>`;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Veja o trade-in dentro da sua loja
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Clique no botão da vitrine e percorra a experiência do cliente até
              o final. Este teste não cria solicitações nem envia dados de
              cliente.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RotateCcw />
            Reiniciar teste
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div
            className="flex gap-2"
            role="group"
            aria-label="Tamanho da prévia"
          >
            <Button
              variant={viewport === "desktop" ? "default" : "outline"}
              aria-pressed={viewport === "desktop"}
              onClick={() => setViewport("desktop")}
            >
              <Monitor />
              Computador
            </Button>
            <Button
              variant={viewport === "mobile" ? "default" : "outline"}
              aria-pressed={viewport === "mobile"}
              onClick={() => setViewport("mobile")}
            >
              <Smartphone />
              Celular
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {store.name} ·{" "}
            {store.mode === "instant_coupon"
              ? "Cupom instantâneo"
              : "Crédito após inspeção"}
          </span>
        </div>
      </Card>
      <div className="rounded-xl border border-border bg-[#e8ece5] p-2 sm:p-5">
        <iframe
          key={`${store.id}-${revision}`}
          title="Prévia interativa do widget na loja"
          srcDoc={preview}
          className="mx-auto block h-[min(760px,85dvh)] w-full rounded-xl border border-border bg-white shadow-sm"
          style={{ maxWidth: viewport === "mobile" ? 390 : 1100 }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        A vitrine é ilustrativa. O widget é o mesmo da integração; catálogo,
        descontos e modalidades seguem as configurações da loja. Use dados
        fictícios para testar o formulário.
      </p>
    </div>
  );
}
