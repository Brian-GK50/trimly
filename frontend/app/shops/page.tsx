"use client";

import { useEffect, useState } from "react";
import ShopCard from "@/components/ShopCard";
import { api, getApiErrorMessage } from "@/lib/api";
import type { Shop } from "@/types";

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get<{ shops: Shop[] }>("/shops")
      .then(({ data }) => {
        if (!cancelled) setShops(data.shops);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(requestError, "Unable to load shops."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">THE NEIGHBORHOOD CHAIR</span>
        <h1>Find your <em>kind of place.</em></h1>
        <p>Great cuts, good people, and a spot that feels like yours.</p>
      </div>
      <div className="filter-row"><span className="filter-chip active">All shops <b>{shops.length}</b></span><span className="filter-chip">Barbershops</span><span className="filter-chip">Salons</span><span className="filter-location">⌖ Nairobi, Kenya <span>⌄</span></span></div>
      {error ? <p className="auth-error" role="alert">{error}</p>
        : loading ? <p>Loading shops…</p>
          : <div className="shop-grid shop-grid-browse">{shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div>}
    </main>
  );
}
