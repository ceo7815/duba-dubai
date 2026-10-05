import { LoginForm } from "@/app/login/login-form";

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
