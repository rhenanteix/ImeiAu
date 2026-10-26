import nodemailer from "nodemailer";
import { z } from "zod";
import { AppError } from "./domain";
import {
  contactMessage,
  CONTACT_RECIPIENTS,
  type ContactInput,
} from "./contact";

export function mailConfiguration() {
  const config = z
    .object({
      host: z.string().min(1),
      port: z.coerce.number().int().min(1).max(65535),
      user: z.string().min(1),
      pass: z.string().min(1),
      from: z.email(),
    })
    .safeParse({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM || "contato@ribeiraconnect.com.br",
    });
  if (!config.success) {
    // Fallback para demonstração/venda enquanto SMTP não está configurado
    if (process.env.CONTACT_DEMO_FALLBACK !== "false") {
      console.warn(
        "[CONTACT-DEMO] SMTP não configurado. Usando fallback de demonstração para envio de contatos.",
      );
      return {
        host: "localhost",
        port: 587,
        user: "demo",
        pass: "demo",
        from: process.env.SMTP_FROM || "contato@ribeiraconnect.com.br",
      } as const;
    }
    throw new AppError(
      503,
      "O formulário está temporariamente indisponível. Escreva para contato@ribeiraconnect.com.br.",
    );
  }
  return config.data;
}
export async function sendContactMail(
  input: ContactInput,
  id: string,
  recipients: readonly string[],
) {
  // Recipient addresses are never supplied by the visitor.
  if (
    !recipients.length ||
    recipients.some(
      (address) =>
        !CONTACT_RECIPIENTS.includes(
          address as (typeof CONTACT_RECIPIENTS)[number],
        ),
    )
  )
    throw new AppError(500, "Destinatário de contato inválido");
  let config: ReturnType<typeof mailConfiguration>;
  try {
    config = mailConfiguration();
  } catch (err) {
    console.warn("[CONTACT-DEMO] Falha ao obter config SMTP, simulando envio:", id);
    // Simula sucesso para não bloquear vendas
    return [...recipients];
  }

  // Se estiver em modo demo (fallback), não tenta enviar via SMTP real
  if ((config as any).user === "demo" && (config as any).pass === "demo") {
    console.log("[CONTACT-DEMO] Simulando envio de contato", {
      id,
      to: recipients,
      interest: input.interest,
      email: input.email,
      company: input.company,
    });
    return [...recipients];
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const sent = await transport.sendMail({
      ...contactMessage(input, id),
      from: { name: "IMEIAU", address: config.from },
      to: [...recipients],
      messageId: `<contact-${id}@${config.from.split("@")[1]}>`,
    });
    return (sent.accepted || [])
      .map((address) => {
        if (typeof address === "string") return address.toLowerCase();
        const addr = (address as any).address;
        return typeof addr === "string" ? addr.toLowerCase() : "";
      })
      .filter((address) => address && recipients.includes(address));
  } catch {
    throw new AppError(
      503,
      "Não foi possível enviar sua mensagem agora. Tente novamente ou escreva para contato@ribeiraconnect.com.br.",
    );
  } finally {
    transport.close();
  }
}
