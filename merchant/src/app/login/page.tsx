"use client";
import { Brand } from "@/components/brand";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md">
        <a href="/" className="text-5xl font-bold tracking-tighter">
          <Brand />
        </a>
        <h1 className="mt-12 text-3xl tracking-tight">
          Sua operação, em uma só tela.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Acesse o painel da sua loja.
        </p>
        <form
          className="mt-8 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const values = new FormData(e.currentTarget);
            try {
              const result = await authClient.signIn.email({
                email: String(values.get("email")),
                password: String(values.get("password")),
              });
              if (result.error)
                setError("Não foi possível entrar. Confira suas credenciais.");
              else window.location.assign("/dashboard");
            } catch {
              setError("Serviço indisponível. Tente novamente.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <label className="field" htmlFor="email">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="field" htmlFor="password">
              Senha
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <Button className="w-full" disabled={busy}>
            {busy ? "Entrando…" : "Entrar no painel →"}
          </Button>
        </form>
        <p className="mt-8 text-xs text-muted-foreground">
          Acesso restrito aos usuários cadastrados pela operação.
        </p>
      </section>
    </main>
  );
}
