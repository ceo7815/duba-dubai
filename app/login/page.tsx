import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";

const description = "קישור הכניסה של צוות דובה למערכת הניהול – הזמנות, מטבח, לקוחות וכספים.";

export const metadata: Metadata = {
  title: "כניסה למערכת הניהול · דובה",
  description,
  openGraph: { title: "דובה · כניסה למערכת הניהול", description, url: "/admin" },
};

export default function LoginPage() {
  return (
    <main className="login-stage">
      <div className="login-tech" aria-hidden="true">
        <div className="login-grid" />
        <div className="login-grid-fine" />
        <div className="login-floor" />
        <div className="login-scan" />
      </div>
      <section className="login-frame">
        <img
          src="/brand/duba-logo.png"
          alt="duba"
          className="login-logo"
        />
        <p className="login-kicker">כניסה למערכת</p>
        <LoginForm />
      </section>
    </main>
  );
}
