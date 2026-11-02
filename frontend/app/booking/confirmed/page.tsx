import Link from "next/link";

export default async function ConfirmedPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const params = await searchParams;
  return (
    <main className="confirmation-page">
      <div className="confirmation-card">
        <span className="confirmation-icon">✓</span>
        <span className="eyebrow">IT’S IN THE BOOKS</span>
        <h1>You’re all <em>set.</em></h1>
        <p>Your appointment is confirmed. We’ve saved your chair and sent the details your way.</p>
        <div className="confirmation-reference"><span>BOOKING REFERENCE</span><strong>{params.ref ?? "TRM-000000"}</strong></div>
        <Link className="button button-wide" href="/dashboard">View your bookings <span>→</span></Link>
        <Link className="text-link confirmation-link" href="/shops">Back to exploring</Link>
      </div>
    </main>
  );
}
