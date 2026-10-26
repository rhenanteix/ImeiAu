import { Brand } from "@/components/brand";
import { ContactForm } from "@/components/contact-form";
import { LandingMotion } from "@/components/landing-motion";
import Link from "next/link";
import { Simulator } from "@/components/simulator";
import styles from "./landing.module.css";
export const metadata = {
  title: "IMEIAU · Seu usado tem valor",
  description:
    "Entenda o trade-in e simule a troca do seu celular usado por crédito para a próxima compra.",
};
export default function Page() {
  return (
    <LandingMotion className={styles.landing}>
      <header className={styles.nav}>
        <Link className={styles.logo} href="/">
          <Brand />
        </Link>
        <nav aria-label="Menu principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#demonstracao">Demonstração</a>
          <a href="#contato">Fale com a gente</a>
          <Link href="/dashboard">Entrar na plataforma ↗</Link>
        </nav>
      </header>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p data-reveal className={styles.eyebrow}>
              MENOS NA GAVETA. MAIS POSSIBILIDADES.
            </p>
            <h1>
              <span>
                <span>Seu próximo</span>
              </span>
              <span>
                <span>começo está</span>
              </span>
              <span>
                <span>
                  no seu <em>usado.</em>
                </span>
              </span>
            </h1>
            <p data-reveal data-delay="180" className={styles.intro}>
              Seu celular ainda tem valor. Com o trade-in, você troca o aparelho
              que já tem por crédito para a próxima compra.
            </p>
            <div data-reveal data-delay="280" className={styles.heroActions}>
              <a href="#demonstracao" style={{ textDecoration: "none" }}>
                Ver demonstração ↗
              </a>
              <a href="#contato">
                Quero vender com trade-in <span aria-hidden="true">→</span>
              </a>
            </div>
            <p data-reveal data-delay="340" className={styles.caption}>
              Conheça a experiência · Sem compromisso · Demonstração
            </p>
          </div>
          <div
            data-reveal
            data-delay="160"
            className={styles.scene}
            aria-label="Ilustração de um celular usado se transformando em crédito"
          >
            <div className={styles.orbit} />
            <span className={styles.sceneLabel}>
              TODO APARELHO MERECE UMA NOVA VOLTA
            </span>
            <div className={styles.phone}>
              <div className={styles.cameras}>
                ● ●<br />●
              </div>
              <span>↗</span>
              <small>O que vem depois?</small>
            </div>
            <div className={styles.credit}>
              <small>SEU USADO → NOVAS POSSIBILIDADES</small>
              <p>iPhone 13 · 128 GB</p>
              <strong>
                R$ 1.800<span>,00</span>
              </strong>
              <small>Exemplo ilustrativo de crédito</small>
              <div>Uma troca. Um novo começo. ↗</div>
            </div>
            <span className={styles.cycle}>
              01 → 02
              <br />
              <small>DO USADO AO NOVO</small>
            </span>
          </div>
        </section>
        <div data-reveal className={styles.strip}>
          <span>AVALIE SEU CELULAR</span>
          <b>↗</b>
          <span>ENVIE PARA INSPEÇÃO</span>
          <b>↗</b>
          <span>TRANSFORME EM CRÉDITO</span>
        </div>
        <section id="como-funciona" className={styles.section}>
          <p data-reveal className={styles.eyebrow}>
            01 / ENTENDA A TROCA
          </p>
          <h2 data-reveal>
            Não é só trocar de celular.
            <br />É aproveitar o valor dele.
          </h2>
          <div className={styles.steps}>
            {[
              [
                "01",
                "Conte sobre seu aparelho",
                "Escolha marca, modelo e armazenamento. Informe como estão a tela, a bateria e o funcionamento.",
              ],
              [
                "02",
                "Conheça sua estimativa",
                "Veja o crédito calculado com as condições da loja. Você decide se quer continuar.",
              ],
              [
                "03",
                "Confirme e envie",
                "Informe seus dados e o IMEI. Na operação real, uma autorização orienta o envio para inspeção.",
              ],
              [
                "04",
                "Dê o próximo passo",
                "A loja confere o aparelho e libera o crédito conforme a modalidade escolhida. Uma divergência pode gerar uma nova proposta.",
              ],
            ].map(([n, t, d], index) => (
              <article data-reveal data-delay={index * 100} key={n}>
                <span>{n} ↗</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        {/*
        <section id="simular" className={`${styles.section} ${styles.demo}`}>
          <div data-reveal>
            <p className={styles.eyebrow}>02 / EXPERIMENTE AGORA</p>
            <h2 data-reveal>
              Quanto vale
              <br />a sua próxima volta?
            </h2>
            <p>
              Avalie seu aparelho, conheça a estimativa e conclua uma
              solicitação de teste. Tudo aqui, sem precisar entrar na
              plataforma.
            </p>
            <small>
              Este ambiente usa cupons e códigos de postagem simulados. Não
              envie aparelhos com esses códigos.
            </small>
          </div>
          <div data-reveal data-delay="160" className={styles.simCard}>
            <span>↻</span>
            <h3>Comece pelo que você já tem.</h3>
            <p>
              Tenha o modelo e o estado do celular em mãos. O IMEI só entra na
              confirmação.
            </p>
            <Simulator label="Começar meu trade-in ↗" />
            <small>Use o botão “Preencher dados de teste” no formulário.</small>
          </div>
        </section>
        */}
<section id="demonstracao" className={`${styles.section} ${styles.demo}`}>
          <div data-reveal>
            <p className={styles.eyebrow}>02 / VEJA EM AÇÃO</p>
            <h2 data-reveal>
              Veja como o trade-in
              <br />
              gera valor para sua <em>loja.</em>
            </h2>
            <p>
              Em poucos cliques, seu cliente evaluates o celular usado e recebe
              crédito na hora. Mais conversão, mais vendas e menos estoque parado.
            </p>
            <div className={styles.heroActions} style={{ marginTop: "2rem" }}>
              <a href="#contato" style={{ textDecoration: "none" }}>
                Quero levar o IMEIAU para minha loja ↗
              </a>
              <a href="/dashboard" style={{ textDecoration: "none" }}>
                Experimentar o simulador ↗
              </a>
            </div>
            <small style={{ display: "block", marginTop: "1rem", opacity: 0.7 }}>
              Demonstração ilustrativa. Personalizamos para o modelo da sua operação.
            </small>
          </div>
          <div data-reveal data-delay="160" className={styles.simCard}>
            <span>↻</span>
            <h3>Comece pelo que você já tem.</h3>
            <p>
              Tenha o modelo e o estado do celular em mãos. O IMEI só entra na
              confirmação.
            </p>
            <p>
              Experimente o simulador diretamente na plataforma: avalie um
              aparelho, veja a estimativa de crédito e entenda cada etapa do
              fluxo.
            </p>
            <a href="/dashboard" className={styles.ctaButton} style={{ marginTop: "1.5rem" }}>
              Ir para o simulador ↗
            </a>
            <small style={{ display: "block", marginTop: "1rem" }}>
              Quer ver com o catálogo da sua loja? Fale com a gente pelo formulário.
            </small>
          </div>
        </section>
        <section className={`${styles.section} ${styles.questions}`}>
          <p data-reveal className={styles.eyebrow}>
            03 / SEM DÚVIDAS NO CAMINHO
          </p>
          <h2 data-reveal>Antes da próxima volta.</h2>
          <div className={styles.faq}>
            {[
              [
                "O que é trade-in?",
                "É entregar um aparelho usado como parte do pagamento de uma nova compra. A estimativa considera o modelo e o estado do aparelho; o valor é confirmado pela inspeção.",
              ],
              [
                "Onde encontro o IMEI?",
                "Em Ajustes ou Configurações, na seção Sobre o telefone, ou digitando *#06#. São 15 números que identificam o aparelho. O identificador é conferido na confirmação e na inspeção. A consulta de bloqueio depende da disponibilidade do serviço IMEI.info; um resultado inconclusivo nunca significa aparelho liberado.",
              ],
              [
                "Quando recebo o crédito?",
                "Depende da política da loja: cupom ao confirmar a solicitação ou após aprovação na inspeção. O envio e a conferência continuam necessários nas duas modalidades.",
              ],
              [
                "Tenho uma loja. Onde gerencio as trocas?",
                "Acesse a plataforma pelo botão no topo. Lá você gerencia solicitações, preços e condições e testa o simulador com o catálogo da sua própria loja.",
              ],
            ].map(([q, a]) => (
              <details data-reveal key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <ContactForm />
        <section data-reveal className={styles.merchant}>
          <p className={styles.eyebrow}>PARA QUEM VENDE</p>
          <h2 data-reveal>
            Uma nova oportunidade
            <br />
            para sua loja também.
          </h2>
          <p>
            Configure preços, acompanhe as avaliações e teste a experiência do
            seu cliente em um só lugar.
          </p>
          <Link href="/dashboard">Acessar plataforma do lojista ↗</Link>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link className={styles.logo} href="/">
          <Brand />
        </Link>
        <p>Tecnologia para fazer o valor circular.</p>
        <small>Ambiente de demonstração</small>
      </footer>
    </LandingMotion>
  );
}
