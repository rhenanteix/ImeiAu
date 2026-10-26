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
        {/* <ContactForm /> */}
        <section id="recondicionadores" className="px-6 py-24 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
          <div className="max-w-6xl mx-auto">
            <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">MERCADO DE RECONDICIONADORES & GRANDES LOJISTAS</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Sincronização &amp; Ingestão Universal de Dados</h2>
            <p className="text-slate-300 max-w-2xl mb-12">Capacidades do IMEIAU para recondicionadores e lojistas: importação multi-formato, antifraude, grading e exportação de lotes.</p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                ["⚡ Importação Multi-formato (API, XLSX, XML)", "Conecte sua Tabela FIPE de Usados como quiser.", "Importe facilmente suas planilhas de preços (XLSX/CSV), conecte feeds XML de fornecedores ou integre via API REST em tempo real. Atualização instantânea da tabela de trade-in sem esforço manual."],
                ["🛡️ Antifraude e Validação Instantânea de IMEI", "Blindagem total contra bloqueios e irregularidades.", "Cruzamento automático do IMEI com bases oficiais contra perdas, roubos, furtos e bloqueios de operadoras antes de qualquer liberação de cupom."],
                ["🤖 Classificação de Grau de Desgaste (Grading A/B/C)", "Avaliação precisa baseada na condição real do aparelho.", "Questionário inteligente e análise de fotos que categorizam o produto em Graus (A, B ou C), evitando divergências de valores entre o cliente e o técnico da loja."],
                ["📦 Exportação de Lotes e Integração com ERP", "Do checkout direto para o seu controle de estoque.", "Exporte relatórios de aparelhos coletados via Trade-in em XLSX/XML ou sincronize direto com o seu ERP para liquidação rápida ou repasse B2B."],
              ].map(([icon, headline, desc]) => (
                <article key={headline} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-orange-500/50 transition-colors">
                  <div className="text-2xl mb-3">{icon.split(" ")[0]}</div>
                  <h3 className="text-xl font-semibold mb-1">{icon.replace(/^\S+\s/, "")}</h3>
                  <p className="text-orange-400 text-sm mb-2">{headline}</p>
                  <p className="text-slate-300 text-sm">{desc}</p>
                </article>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap gap-3">
              {["Shopify", "Nuvemshop", "WooCommerce", "Integração Customizada (API)"].map((b) => (
                <span key={b} className="px-4 py-2 rounded-full border border-slate-700 text-sm text-slate-200">✓ {b}</span>
              ))}
            </div>
          </div>
        </section>
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
        <a href="mailto:contato@ribeiraconnect.com.br">contato@ribeiraconnect.com.br</a>
        <small>Ambiente de demonstração</small>
      </footer>
    </LandingMotion>
  );
}
