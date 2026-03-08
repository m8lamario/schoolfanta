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
    <nav className={styles.nav}>
      <Link
        href="/dashboard"
        className={`${styles.tab} ${isActive("/dashboard") ? styles.active : ""}`}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className={styles.label}>Squadra</span>
      </Link>

      <Link
        href="/dashboard/standings"
        className={`${styles.tab} ${isActive("/dashboard/standings") ? styles.active : ""}`}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
          <path d="M4 22h16" />
          <path d="M10 22V8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v1" />
          <path d="M14 22V8a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1" />
          <path d="M8 6h8" />
          <path d="M8 2h8" />
        </svg>
        <span className={styles.label}>Classifiche</span>
      </Link>

      {hasLiveMatch && (
        <Link
          href="/dashboard/live"
          className={`${styles.tab} ${styles.liveTab} ${isActive("/dashboard/live") ? styles.active : ""}`}
        >
          <div className={styles.liveIconWrapper}>
            <span className={styles.liveDot} />
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <span className={styles.label}>Live</span>
        </Link>
      )}

      <Link
        href="/dashboard/me"
        className={`${styles.tab} ${isActive("/dashboard/me") ? styles.active : ""}`}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className={styles.label}>Profilo</span>
      </Link>
    </nav>
  );
}

