"use client";
import { Brand } from "@/components/brand";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { money } from "@/lib/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
type Offer = {
  amountCents: number;
  reason: string;
  device: string;
  expiresAt: string;
  respondedAt: string | null;
  accepted: boolean | null;
};
function OfferContent({ token }: { token: string }) {
  const [offer, setOffer] = useState<Offer | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    if (!token) {
      setMessage("Link de proposta inválido.");
      return;
    }
    api<Offer>("offers/view", "POST", { token })
      .then((value) => {
        if (active) setOffer(value);
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  async function respond(accept: boolean) {
    setBusy(true);
    try {
      const result = await api<{
        couponCode: string | null;
        returnShippingCode: string | null;
      }>("offers/respond", "POST", { token, accept });
      setDone(true);
      setMessage(
        accept
          ? `Proposta aceita! ${result.couponCode || "Liberação PIX simulada registrada."}`
          : `Proposta recusada. Devolução: ${result.returnShippingCode}`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const expired = offer && new Date(offer.expiresAt) < new Date();
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-lg p-8">
        <p className="text-4xl font-bold tracking-tighter">
          <Brand />
        </p>
        <h1 className="mt-8 text-2xl">Uma atualização sobre seu aparelho.</h1>
        {offer && (
          <>
            <p className="mt-4 text-muted-foreground">{offer.device}</p>
            <p className="mt-4 text-sm">{offer.reason}</p>
            <p className="mt-6 text-xs text-muted-foreground">
              Valor final proposto
            </p>
            <strong className="text-4xl">{money(offer.amountCents)}</strong>
            <p className="mt-4 text-xs text-muted-foreground">
              Válida até {new Date(offer.expiresAt).toLocaleString("pt-BR")}
            </p>
            {offer.respondedAt ? (
              <p className="mt-6">
                Esta proposta já foi {offer.accepted ? "aceita" : "recusada"}.
              </p>
            ) : expired ? (
              <p className="mt-6">Proposta expirada. Contate a loja.</p>
            ) : (
              !done && (
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button disabled={busy} onClick={() => respond(true)}>
                    Aceitar proposta
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => respond(false)}
                  >
                    Recusar e devolver
                  </Button>
                </div>
              )
            )}
          </>
        )}
        <p role="status" className="mt-5 break-words text-sm">
          {message}
        </p>
        <p className="mt-8 text-xs text-muted-foreground">
          Demonstração. Nenhum pagamento ou envio real será realizado.
        </p>
      </Card>
    </main>
  );
}

export default function OfferPage() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setToken(window.location.hash.slice(1));
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  if (token === null)
    return (
      <p role="status" className="p-8">
        Carregando proposta…
      </p>
    );
  return <OfferContent key={token} token={token} />;
}
