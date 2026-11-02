"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import OwnerDashboard from "@/components/OwnerDashboard";
import type { Account } from "@/lib/auth";
import type { SavedBooking } from "@/store/bookingStore";

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const { data: accountData } = await api.get<{ user: Account }>("/auth/me");
        const bookingData = accountData.user.role === "owner"
          ? { bookings: [] as SavedBooking[] }
          : (await api.get<{ bookings: SavedBooking[] }>("/bookings")).data;
        if (!cancelled) {
          setAccount(accountData.user);
          setBookings(bookingData.bookings);
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(getApiErrorMessage(error, "Unable to load your dashboard."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  async function logout() {
    setErrorMessage("");
    try {
      await api.post("/auth/logout");
      setAccount(null);
      setBookings([]);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Unable to log out. Please try again."));
    }
  }

  return (
    <main className="page-shell dashboard-page">
      <div className="dashboard-heading">
        <div><span className="eyebrow">{account?.role === "owner" ? "YOUR BUSINESS, AT A GLANCE" : "YOUR TRIMLY SPACE"}</span><h1>{account?.role === "owner" ? "The shop floor." : `Good to see you${account?.name ? `, ${account.name}` : ""}.`}</h1><p>{account?.role === "owner" ? "A little less admin. A lot more good work." : "Your next good hair day is just around the corner."}</p></div>
        {account && <button className="quiet-button" onClick={logout}>Log out</button>}
      </div>
      {errorMessage && <p className="auth-error" role="alert">{errorMessage} <Link href="/login">Sign in</Link></p>}
      {loading ? <section className="dashboard-card"><p>Loading your appointments…</p></section>
        : account?.role === "owner" ? <OwnerDashboard />
          : account ? <section className="dashboard-card"><div className="dashboard-card-heading"><div><span className="eyebrow">COMING UP</span><h2>Your appointments</h2></div><Link className="text-link" href="/shops">Find a shop <span>→</span></Link></div>
            {bookings.length ? <div className="appointment-list">{bookings.map((booking) => <article className="appointment-row" key={booking.reference}><span className="appointment-date">✳</span><div className="appointment-details"><strong>{booking.serviceName}</strong><span>{booking.shopName} · with {booking.stylistName}</span><small>{booking.date} at {booking.time}</small></div><span className="confirmed-tag">{booking.status === "CONFIRMED" ? "Confirmed" : booking.status === "PENDING_PAYMENT" ? "Awaiting payment" : booking.status.toLowerCase()}</span></article>)}</div> : <div className="empty-state"><span className="empty-icon">✳</span><h3>No appointments yet.</h3><p>Your next favorite barber is out there. Let’s find them.</p><Link className="button" href="/shops">Explore shops <span>→</span></Link></div>}
          </section>
            : <section className="dashboard-card"><div className="empty-state"><span className="empty-icon">✳</span><h3>Sign in to see your appointments.</h3><p>Your bookings will be waiting in one place.</p><Link className="button" href="/login">Log in <span>→</span></Link></div></section>}
    </main>
  );
}
