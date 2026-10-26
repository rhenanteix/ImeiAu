"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import { Button } from "./ui/button";
import { statusLabels } from "@/lib/domain";
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setData(null);
    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return { data, error, reload: () => setRevision((n) => n + 1) };
}
export function Loading({
  error,
  retry,
}: {
  error?: string;
  retry?: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground"
      role="status"
    >
      {error || "Carregando dados da loja…"}
      {error && retry && (
        <Button className="ml-4" variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function Notice({ message }: { message: string }) {
  return message ? (
    <p role="status" className="my-4 rounded-lg bg-muted p-3 text-sm">
      {message}
    </p>
  ) : null;
}
export function Badge({ status }: { status: keyof typeof statusLabels }) {
  const color =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : status === "counteroffered"
          ? "bg-purple-50 text-purple-700"
          : status === "inspecting"
            ? "bg-amber-50 text-amber-800"
            : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${color}`}
    >
      {statusLabels[status]}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      aria-label={title}
      className="fixed inset-0 m-auto w-[min(760px,calc(100%-24px))] rounded-2xl border border-border bg-background p-0 text-foreground shadow-xl"
    >
      <header className="flex items-center justify-between border-b border-border bg-white px-6 py-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Button variant="ghost" onClick={onClose} aria-label="Fechar">
          ×
        </Button>
      </header>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
