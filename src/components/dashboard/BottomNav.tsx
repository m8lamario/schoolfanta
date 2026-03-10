"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

type BottomNavProps = {
  hasLiveMatch: boolean;
};

export default function BottomNav({ hasLiveMatch }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.nav} aria-label="Navigazione principale">
      <Link
        href="/dashboard"
        className={`${styles.tab} ${isActive("/dashboard") ? styles.active : ""}`}
        aria-label="Squadra"
        aria-current={isActive("/dashboard") ? "page" : undefined}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
          <path d="M9 22V13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v9" />
        </svg>
        <span className={styles.label}>Squadra</span>
      </Link>

      <Link
        href="/dashboard/standings"
        className={`${styles.tab} ${isActive("/dashboard/standings") ? styles.active : ""}`}
        aria-label="Classifiche"
        aria-current={isActive("/dashboard/standings") ? "page" : undefined}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
          <path d="M4 22h16" />
          <path d="M10 14.5V8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v1" />
          <path d="M14 14.5V8a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1" />
          <path d="M8 6h8" />
          <path d="M8 2h8" />
          <path d="M10 14.5h4" />
          <path d="M12 14.5V22" />
        </svg>
        <span className={styles.label}>Classifiche</span>
      </Link>

      {hasLiveMatch && (
        <Link
          href="/dashboard/live"
          className={`${styles.tab} ${styles.liveTab} ${isActive("/dashboard/live") ? styles.active : ""}`}
          aria-label="Partita live"
          aria-current={isActive("/dashboard/live") ? "page" : undefined}
        >
          <div className={styles.liveIconWrapper}>
            <span className={styles.liveDot} aria-hidden="true" />
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </div>
          <span className={styles.label}>Live</span>
        </Link>
      )}

      <Link
        href="/dashboard/me"
        className={`${styles.tab} ${isActive("/dashboard/me") ? styles.active : ""}`}
        aria-label="Profilo"
        aria-current={isActive("/dashboard/me") ? "page" : undefined}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
        </svg>
        <span className={styles.label}>Profilo</span>
      </Link>
    </nav>
  );
}

