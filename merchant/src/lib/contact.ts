import { z } from "zod";

const singleLine = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/[\r\n]/.test(value), "Use apenas uma linha");
export const contactSchema = z
  .object({
    name: singleLine(3, 120),
    company: singleLine(2, 120),
    email: z.email().trim().toLowerCase().max(254),
    phone: z
      .string()
      .max(24)
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{10,15}$/, "Informe WhatsApp com DDD")),
    interest: z.enum(["demo", "integration", "partnership", "other"]),
    message: z.string().trim().min(10).max(3000),
    consent: z.literal(true),
    website: z.literal("").default(""),
  })
  .strict();
export type ContactInput = z.infer<typeof contactSchema>;
export const CONTACT_RECIPIENTS = [
  "contato@ribeiraconnect.com.br",
  "rhenancontato@gmail.com",
] as const;
export const contactSubjects = {
  demo: "Conhecer a plataforma",
  integration: "Integrar à minha loja",
  partnership: "Parceria",
  other: "Outro assunto",
};
export function contactMessage(input: ContactInput, id: string) {
  return {
    subject: `[IMEIAU] Novo contato — ${contactSubjects[input.interest]}`,
    replyTo: { name: input.name, address: input.email },
    text: [
      "Novo contato pela landing IMEIAU",
      "",
      `Nome: ${input.name}`,
      `Empresa: ${input.company}`,
      `E-mail: ${input.email}`,
      `WhatsApp: ${input.phone}`,
      `Assunto: ${contactSubjects[input.interest]}`,
      "",
      input.message,
      "",
      "O visitante autorizou o contato para atender esta solicitação.",
      `Protocolo: ${id}`,
    ].join("\n"),
  };
}
