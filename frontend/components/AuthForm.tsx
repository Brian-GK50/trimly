"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [role, setRole] = useState<"customer" | "owner">("customer");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const isRegister = mode === "register";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    setSubmitting(true);
    setErrorMessage("");
    try {
      const response = await api.post("/auth/" + (isRegister ? "register" : "login"), {
        email,
        password,
        ...(isRegister ? { name: String(formData.get("name")), role } : {}),
      });
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
      router.push(safeNext ?? (response.data.user.role === "owner" ? "/dashboard?view=owner" : "/dashboard"));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to sign in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <span className="brand"><span className="brand-mark">t.</span>trimly</span>
        <div className="auth-art-copy"><span className="eyebrow">MAKE TIME FOR YOU</span><h2>A little care<br />goes a <em>long way.</em></h2><p>Good people, good cuts, and a booking that fits your day.</p></div>
        <span className="auth-art-footer">NAIROBI, KENYA · EST. FOR EVERY GOOD HAIR DAY</span>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">{isRegister ? "WELCOME TO TRIMLY" : "GOOD TO HAVE YOU BACK"}</span>
          <h1>{isRegister ? "Create your account." : "Come on in."}</h1>
          <p className="auth-intro">{isRegister ? "A few details and you’re on your way." : "Log in to pick up right where you left off."}</p>
          <form onSubmit={submit}>
            {isRegister && <><span className="input-label">I’m here as a...</span><div className="role-toggle"><button type="button" className={role === "customer" ? "active" : ""} onClick={() => setRole("customer")}>Customer</button><button type="button" className={role === "owner" ? "active" : ""} onClick={() => setRole("owner")}>Shop owner</button></div><label className="input-label" htmlFor="name">Your name</label><input className="text-input" id="name" name="name" placeholder="e.g. Alex Mwangi" autoComplete="name" required /></>}
            <label className="input-label" htmlFor="email">Email address</label><input className="text-input" id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <label className="input-label" htmlFor="password">Password</label><input className="text-input" id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} required />
            {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
            <button className="button button-wide auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait…" : isRegister ? "Create account" : "Log in"} <span>→</span></button>
          </form>
          <p className="auth-switch">{isRegister ? "Already have an account?" : "New to Trimly?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Log in" : "Create an account"}</Link></p>
          <p className="auth-disclaimer">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </section>
    </main>
  );
}
