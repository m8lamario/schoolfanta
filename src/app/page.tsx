import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.background} aria-hidden="true">
        <div className={styles.grid} />
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />
      </div>
      <main className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.badge}>Fanta scolastico</span>
            <h1 className={styles.title}>
              Crea la tua squadra, domina il campus con
              <span className={styles.highlight}> SchoolFanta</span>.
            </h1>
            <p className={styles.subtitle}>
              Scegli, schiera e scala la classifica con un fantatorneo pensato
              per studenti. Sfide veloci, tattiche e una grafica neon che ti
              spinge a giocare ogni giorno.
            </p>
            <div className={styles.ctaRow}>
              <a className={styles.buttonPrimary} href="#start">
                Inizia ora
              </a>
              <a className={styles.buttonSecondary} href="#features">
                Scopri di piu
              </a>
            </div>
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>3</span>
                <span className={styles.statLabel}>Scontri rapidi</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>5</span>
                <span className={styles.statLabel}>Ruoli smart</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>1</span>
                <span className={styles.statLabel}>Classifica unica</span>
              </div>
            </div>
          </div>
          <div className={styles.heroPanel}>
            <div className={styles.panelCard}>
              <p className={styles.panelEyebrow}>Matchday live</p>
              <h3 className={styles.panelTitle}>Schiera in 30 secondi</h3>
              <p className={styles.panelText}>
                Interfaccia touch-first, suggerimenti e tooltip per fare mosse
                rapide senza perdere il ritmo.
              </p>
              <div className={styles.panelTags}>
                <span>Boost</span>
                <span>Bonus</span>
                <span>Draft</span>
              </div>
            </div>
          </div>
        </header>

        <section id="features" className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Perche piace</p>
            <h2 className={styles.sectionTitle}>
              Gameplay veloce, vibes neon, competizione tra amici.
            </h2>
          </div>
          <div className={styles.cardGrid}>
            <article className={styles.card}>
              <h3>Draft istantaneo</h3>
              <p>
                Crea la rosa in pochi tap con ruoli chiari e suggerimenti smart.
              </p>
            </article>
            <article className={styles.card}>
              <h3>Bonus creativi</h3>
              <p>
                Regole speciali e power-up per ribaltare la classifica a ogni
                turno.
              </p>
            </article>
            <article className={styles.card}>
              <h3>Classifica live</h3>
              <p>
                Aggiornamenti rapidi e badge che mostrano chi sta dominando.
              </p>
            </article>
          </div>
        </section>

        <section id="how" className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Come si gioca</p>
            <h2 className={styles.sectionTitle}>
              Tre passi e sei gia in partita.
            </h2>
          </div>
          <ol className={styles.steps}>
            <li>
              <h4>Crea la tua lega</h4>
              <p>Invita la tua classe e scegli le regole base.</p>
            </li>
            <li>
              <h4>Schiera la squadra</h4>
              <p>Componi la formazione con scelte rapide e intuitive.</p>
            </li>
            <li>
              <h4>Scala la classifica</h4>
              <p>Ogni matchday e una sfida, ogni bonus puo cambiare tutto.</p>
            </li>
          </ol>
        </section>

        <section id="start" className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <div>
              <p className={styles.sectionEyebrow}>Pronto a giocare?</p>
              <h2 className={styles.sectionTitle}>
                Accendi il campionato della tua scuola.
              </h2>
            </div>
            <a className={styles.buttonPrimary} href="#">
              Inizia ora
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
