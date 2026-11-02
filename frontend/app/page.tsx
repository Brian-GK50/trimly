"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ShopCard from "@/components/ShopCard";
import { api, getApiErrorMessage } from "@/lib/api";
import type { Shop } from "@/types";

export default function HomePage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get<{ shops: Shop[] }>("/shops")
      .then(({ data }) => {
        if (!cancelled) setShops(data.shops);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(requestError, "Unable to load shops."));
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">NAIROBI, YOUR CHAIR IS WAITING</span>
            <h1>Your next great<br /><em>cut starts here.</em></h1>
            <p>Find your people, pick your time, and show up feeling like yourself. The best barbers and salons in town, all in one place.</p>
            <Link href="/shops" className="button">Find your barber <span>→</span></Link>
            <div className="hero-proof"><div className="proof-avatars"><i>J</i><i>M</i><i>K</i><i>+</i></div><span><strong>2,400+</strong> good hair days booked</span></div>
          </div>
          <div className="hero-art" aria-label="Illustration of a barbershop chair">
            <div className="art-circle" />
            <div className="art-sun" />
            <div className="art-chair"><div className="chair-back" /><div className="chair-seat" /><div className="chair-post" /><div className="chair-base" /><div className="chair-foot" /></div>
            <div className="art-caption"><span>01 / YOUR NEXT APPOINTMENT</span><strong>Make time for you.</strong></div>
            <span className="art-star">✳</span>
          </div>
        </div>
      </section>
      <section className="steps-strip">
        <div className="steps-inner">
          <div><span className="step-number">01</span><span><strong>Find your spot</strong><small>Explore trusted local shops</small></span></div>
          <span className="step-arrow">→</span>
          <div><span className="step-number">02</span><span><strong>Pick your person</strong><small>Choose a service & stylist</small></span></div>
          <span className="step-arrow">→</span>
          <div><span className="step-number">03</span><span><strong>Book your time</strong><small>Pay a small deposit, done</small></span></div>
        </div>
      </section>
      <section className="section featured-section">
        <div className="section-heading">
          <div><span className="eyebrow">GOOD PEOPLE, GREAT WORK</span><h2>Local favorites</h2><p>Thoughtful hands. Good conversations. Great cuts.</p></div>
          <Link className="text-link" href="/shops">Explore all shops <span>→</span></Link>
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p>
          : shops.length ? <div className="shop-grid">{shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div>
            : <p>Finding the neighborhood favorites…</p>}
      </section>
      <section className="owner-banner">
        <div><span className="eyebrow">MADE FOR THE PEOPLE BEHIND THE CHAIR</span><h2>Your craft deserves<br />a little more room.</h2><p>Bring your services, your team, and your bookings together. Spend less time managing and more time doing what you love.</p><Link className="button button-light" href="/dashboard">Grow your shop <span>→</span></Link></div>
        <div className="owner-stat"><strong>01</strong><span>One place for your<br />whole business.</span><span className="owner-star">✳</span></div>
      </section>
    </main>
  );
}
