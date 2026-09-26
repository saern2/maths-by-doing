"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
export default function Login({
  configured,
  unavailable = false,
  setupIssues = [],
}: {
  configured: boolean;
  unavailable?: boolean;
  setupIssues?: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <aside className="login-story">
        <Link href="/" className="studio-brand">
          <BookOpen />
          <span>
            Maths by Doing<small>TEACHER STUDIO</small>
          </span>
        </Link>
        <div>
          <span className="studio-kicker">
            A LITTLE CARE. A BIG DIFFERENCE.
          </span>
          <h1>
            Your classroom.
            <br />
            Your website.
            <br />
            <em>Your way.</em>
          </h1>
          <p>
            A quiet space to share your next lesson, keep your website fresh,
            and help the next student find their way.
          </p>
        </div>
        <div className="login-equation" aria-hidden="true">
          understanding = curiosity + practice
        </div>
      </aside>
      <section className="login-form-wrap">
        <Link href="/" className="back-site">
          Back to website <ArrowUpRight size={16} />
        </Link>
        <form onSubmit={submit} className="login-form">
          <div className="login-lock">
            <LockKeyhole size={25} />
          </div>
          <span className="studio-kicker">WELCOME BACK</span>
          <h2>
            Make room for
            <br />
            the next breakthrough.
          </h2>
          <p>Sign in to your teacher studio.</p>
          {(!configured || unavailable) && (
            <div className="admin-alert" role="status">
              {unavailable
                ? "The database is unavailable. Ask the site owner to check the Turso connection."
                : setupIssues.join(" ") +
                  " Update these values in the Vercel Production environment, then redeploy. No credential values are shown here."}
            </div>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="teacher@example.com"
              maxLength={254}
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                required
                autoComplete="current-password"
                maxLength={256}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && (
            <p className="admin-alert" role="alert">
              {error}
            </p>
          )}
          <button
            className="studio-primary"
            disabled={busy || !configured || unavailable}
          >
            {busy ? "Signing in…" : "Enter your studio"}
            <ArrowRight size={18} />
          </button>
          <p className="login-help">
            Forgot your password? Ask the site owner to reset your admin
            credentials.
          </p>
        </form>
        <p className="login-footer">
          <LockKeyhole size={13} /> A private space. Only for your teaching
          team.
        </p>
      </section>
    </div>
  );
}
