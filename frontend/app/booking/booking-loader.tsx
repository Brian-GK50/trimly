"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BookingClient from "./booking-client";
import { api, getApiErrorMessage } from "@/lib/api";
import type { Shop } from "@/types";

export default function BookingLoader({
  shopId,
  serviceId,
  stylistId,
}: {
  shopId: string;
  serviceId?: string;
  stylistId?: string;
}) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get<{ shop: Shop }>(`/shops/${encodeURIComponent(shopId)}`)
      .then(({ data }) => {
        if (!cancelled) setShop(data.shop);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(requestError, "Unable to load this shop."));
      });
    return () => { cancelled = true; };
  }, [shopId]);

  if (error) {
    return <main className="page-shell"><p className="auth-error" role="alert">{error}</p><Link className="text-link" href="/shops">Explore shops <span>→</span></Link></main>;
  }
  if (!shop) return <main className="page-shell"><p>Loading appointment details…</p></main>;
  if (!shop.services.length || !shop.staff.length) {
    return <main className="page-shell"><p>This shop has no services or stylists available to book yet.</p><Link className="text-link" href={`/shops/${shop.id}`}>Back to shop <span>→</span></Link></main>;
  }

  const service = shop.services.find((item) => item.id === serviceId) ?? shop.services[0];
  const stylist = shop.staff.find((item) => item.id === stylistId) ?? shop.staff[0];
  return <BookingClient shop={shop} service={service} stylist={stylist} />;
}
