"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import BarberCard from "@/components/BarberCard";
import ServiceCard from "@/components/ServiceCard";
import { api, getApiErrorMessage } from "@/lib/api";
import type { Shop } from "@/types";

export default function ShopDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get<{ shop: Shop }>(`/shops/${encodeURIComponent(id)}`)
      .then(({ data }) => {
        if (!cancelled) setShop(data.shop);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(requestError, "Unable to load this shop."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <main className="page-shell"><p>Loading shop…</p></main>;
  if (error || !shop) return <main className="page-shell"><h1>{error || "We couldn’t find that shop."}</h1><Link className="text-link" href="/shops">Explore all shops <span>→</span></Link></main>;
  const firstService = shop.services[0];
  const firstStylist = shop.staff[0];
  return (
    <main className="page-shell shop-detail">
      <Link className="back-link" href="/shops">← All shops</Link>
      <div className="detail-hero" style={{ background: shop.image }}><span>{shop.category}</span><span className="detail-flower">✳</span></div>
      <div className="detail-heading">
        <div><span className="eyebrow">{shop.location.toUpperCase()}</span><h1>{shop.name}</h1><p className="shop-location">⌖ {shop.address}</p></div>
        <div className="detail-rating"><strong>★ {shop.rating}</strong><span>{shop.reviews} reviews</span></div>
      </div>
      <div className="detail-columns">
        <section className="detail-main">
          <div className="detail-section-title"><div><span className="eyebrow">TAKE YOUR PICK</span><h2>Services</h2></div><span className="muted">Select a service to book</span></div>
          <div className="service-list">{shop.services.map((service) => <ServiceCard key={service.id} service={service} selected={false} onSelect={() => router.push(`/booking?shop=${shop.id}&service=${service.id}&stylist=${firstStylist.id}`)} />)}</div>
          <div className="detail-section-title stylist-title"><div><span className="eyebrow">GOOD HANDS, GOOD PEOPLE</span><h2>Meet the team</h2></div></div>
          <div className="staff-list">{shop.staff.map((barber) => <BarberCard key={barber.id} barber={barber} selected={false} onSelect={() => router.push(`/booking?shop=${shop.id}&service=${firstService.id}&stylist=${barber.id}`)} />)}</div>
        </section>
        <aside className="shop-aside"><div className="aside-card"><span className="open-status"><i /> {shop.open}</span><h3>Make it a good hair day.</h3><p>Choose a service and stylist to see available times.</p><Link className="button button-wide" href={`/booking?shop=${shop.id}&service=${firstService.id}&stylist=${firstStylist.id}`}>Book an appointment <span>→</span></Link><div className="aside-divider" /><span className="aside-label">LOCATION</span><p className="aside-address">⌖ {shop.address}<br />Nairobi, Kenya</p><span className="aside-label">GOOD TO KNOW</span><p className="aside-address">A small deposit secures your booking. The rest is paid at the shop.</p></div></aside>
      </div>
    </main>
  );
}
