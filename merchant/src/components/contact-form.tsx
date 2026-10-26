"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Mail, X } from "lucide-react";
import { Brand } from "./brand";
import styles from "./contact-form.module.css";

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const attempt = useRef({ signature: "", key: "" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload = {
      ...Object.fromEntries(values),
      consent: values.get("consent") === "on",
    };
    const signature = JSON.stringify(payload);
    if (attempt.current.signature !== signature)
      attempt.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.current.key,
        },
        body: signature,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.detail ||
            "Não foi possível enviar sua mensagem. Tente novamente.",
        );
      setReference(data.id);
      form.reset();
      attempt.current = { signature: "", key: "" };
      dialog.current?.showModal();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="contato" className={styles.section}>
      <div className={styles.copy} data-reveal>
        <p className={styles.eyebrow}>VAMOS CONVERSAR?</p>
        <h2>
          Seu próximo passo
          <br />
          começa com um <em>olá.</em>
        </h2>
        <p>
          Quer conhecer a IMEIAU e entender como o trade-in pode funcionar na
          sua operação? Conte um pouco sobre você. Nossa equipe continua a
          conversa.
        </p>
        <div className={styles.benefits}>
          <span>
            <Check size={17} /> Conheça a jornada do cliente
          </span>
          <span>
            <Check size={17} /> Tire dúvidas sobre integração
          </span>
          <span>
            <Check size={17} /> Converse sobre a sua loja
          </span>
        </div>
        <a className={styles.email} href="mailto:contato@ribeiraconnect.com.br">
          <Mail size={18} /> contato@ribeiraconnect.com.br
        </a>
      </div>
      <form className={styles.form} onSubmit={submit} aria-busy={busy}>
        <h3>Prazer, somos a IMEIAU.</h3>
        <p>Como podemos ajudar?</p>
        <div className={styles.row}>
          <div>
            <label htmlFor="contact-name">Seu nome</label>
            <input
              id="contact-name"
              name="name"
              required
              minLength={3}
              maxLength={120}
              autoComplete="name"
              placeholder="Como podemos chamar você?"
            />
          </div>
          <div>
            <label htmlFor="contact-company">Empresa ou loja</label>
            <input
              id="contact-company"
              name="company"
              required
              minLength={2}
              maxLength={120}
              autoComplete="organization"
              placeholder="Nome da sua operação"
            />
          </div>
        </div>
        <div className={styles.row}>
          <div>
            <label htmlFor="contact-email">E-mail</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="voce@empresa.com.br"
            />
          </div>
          <div>
            <label htmlFor="contact-phone">WhatsApp com DDD</label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              required
              minLength={10}
              maxLength={24}
              autoComplete="tel"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
        <label htmlFor="contact-interest">O que você procura?</label>
        <select id="contact-interest" name="interest" required defaultValue="">
          <option value="" disabled>
            Selecione um assunto
          </option>
          <option value="demo">Conhecer a plataforma</option>
          <option value="integration">Integrar à minha loja</option>
          <option value="partnership">Conversar sobre uma parceria</option>
          <option value="other">Outro assunto</option>
        </select>
        <label htmlFor="contact-message">Conte um pouco sobre sua ideia</label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={4}
          placeholder="Como você imagina o trade-in na sua operação?"
        />
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="contact-website">Deixe este campo vazio</label>
          <input
            id="contact-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <label className={styles.consent}>
          <input type="checkbox" name="consent" required />{" "}
          <span>
            Autorizo a equipe IMEIAU a usar os dados informados para responder
            ao meu contato por e-mail ou WhatsApp.
          </span>
        </label>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? "Enviando sua mensagem…" : "Quero conversar com a IMEIAU"}
          <ArrowUpRight size={19} />
        </button>
        <small>Seus dados serão usados para atender esta solicitação.</small>
      </form>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="contact-success-title"
        aria-describedby="contact-success-description"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className={styles.modalBody}>
          <button
            type="button"
            className={styles.close}
            aria-label="Fechar confirmação"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
          <Brand compact />
          <div className={styles.check}>
            <Check size={34} strokeWidth={2.5} />
          </div>
          <p className={styles.eyebrow}>PRIMEIRO PASSO DADO</p>
          <h2 id="contact-success-title">
            Uma boa conversa
            <br />
            está por vir.
          </h2>
          <p id="contact-success-description">
            Sua mensagem foi enviada à equipe IMEIAU. Vamos responder pelo
            contato que você informou.
          </p>
          <div className={styles.receipt}>
            <Mail size={20} />
            <span>
              Mensagem enviada com sucesso<small>Protocolo: {reference}</small>
            </span>
          </div>
          <button
            type="button"
            autoFocus
            className={styles.submit}
            onClick={() => dialog.current?.close()}
          >
            Perfeito, até logo! <ArrowUpRight size={18} />
          </button>
        </div>
      </dialog>
    </section>
  );
}
