const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function returnLabel(
  code: string,
  customer: { name: string; address: Record<string, string> },
  storeName: string,
) {
  const a = customer.address;
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Devolução simulada · Volta</title><style>body{font:16px/1.6 system-ui;max-width:600px;margin:40px auto;padding:25px;border:2px solid #183e32;color:#183e32}h1{font-size:26px}aside{border:2px dashed #a22;padding:15px;color:#a22}code{display:block;margin:30px 0;font-size:24px;overflow-wrap:anywhere}small{color:#555}@media print{body{margin:0}}</style><h1>volta ↗ · Devolução</h1><aside>DEMONSTRAÇÃO — SEM VALIDADE POSTAL<br>Não utilize esta etiqueta para enviar um aparelho.</aside><p>Loja: ${escape(storeName)}</p><code>${escape(code)}</code><h2>Destinatário</h2><p>${escape(customer.name)}<br>${escape(a.street)}, ${escape(a.number)} ${escape(a.complement)}<br>${escape(a.neighborhood)} — ${escape(a.city)}/${escape(a.state)}<br>CEP ${escape(a.postal_code)}</p><small>Prévia de etiqueta do MVP. A etiqueta oficial depende do provedor de logística contratado.</small></html>`;
}
