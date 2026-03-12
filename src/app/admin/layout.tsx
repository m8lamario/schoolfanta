import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./admin.module.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Doppio controllo: middleware + verifica server-side
  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.adminContainer}>
      <nav className={styles.adminNav}>
        <div className={styles.navBrand}>
          <span className={styles.navIcon}>⚙️</span>
          <span>Admin Panel</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/admin" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/admin/votes" className={styles.navLink}>
            Voti
          </Link>
        </div>
        <Link href="/dashboard" className={styles.backLink}>
          ← Torna al sito
        </Link>
      </nav>
      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}

