"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import type { Shop } from "@/types";

type OwnerBooking = {
  reference: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  stylistName: string;
  date: string;
  time: string;
  status: string;
};

export default function OwnerDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const shop = shops.find((item) => item.id === selectedShopId) ?? null;

  useEffect(() => {
    let cancelled = false;
    api.get<{ shops: Shop[] }>("/shops/mine")
      .then(({ data }) => {
        if (cancelled) return;
        setShops(data.shops);
        setSelectedShopId(data.shops[0]?.id ?? "");
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(requestError, "Unable to load your shops."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedShopId) {
      setBookings([]);
      return;
    }
    let cancelled = false;
    api.get<{ bookings: OwnerBooking[] }>(`/shops/${encodeURIComponent(selectedShopId)}/bookings`)
      .then(({ data }) => {
        if (!cancelled) setBookings(data.bookings);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(requestError, "Unable to load shop bookings."));
      });
    return () => { cancelled = true; };
  }, [selectedShopId]);

  async function refreshShop(shopId: string) {
    const { data } = await api.get<{ shop: Shop }>(`/shops/${encodeURIComponent(shopId)}`);
    setShops((current) => current.map((item) => item.id === shopId ? data.shop : item));
  }

  async function createShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const image = String(form.get("image") ?? "").trim();
      const { data } = await api.post<{ shop: Shop }>("/shops", {
        name: String(form.get("name")),
        location: String(form.get("location")),
        address: String(form.get("address")),
        category: String(form.get("category")),
        ...(image ? { image } : {}),
      });
      setShops((current) => [data.shop, ...current]);
      setSelectedShopId(data.shop.id);
      setNotice("Your shop is live. Add services and team members to get started.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to create your shop."));
    } finally {
      setSaving(false);
    }
  }

  async function updateShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.patch(`/shops/${encodeURIComponent(shop.id)}`, {
        name: String(form.get("name")),
        location: String(form.get("location")),
        address: String(form.get("address")),
        category: String(form.get("category")),
        image: String(form.get("image")),
      });
      await refreshShop(shop.id);
      setNotice("Shop profile updated.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update your shop."));
    } finally {
      setSaving(false);
    }
  }

  async function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.post(`/shops/${encodeURIComponent(shop.id)}/services`, {
        name: String(form.get("name")),
        description: String(form.get("description")),
        duration: Number(form.get("duration")),
        price: Number(form.get("price")),
      });
      await refreshShop(shop.id);
      formElement.reset();
      setNotice("Service added.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to add this service."));
    } finally {
      setSaving(false);
    }
  }

  async function updateService(event: FormEvent<HTMLFormElement>, serviceId: string) {
    event.preventDefault();
    if (!shop) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.patch(`/shops/${encodeURIComponent(shop.id)}/services/${encodeURIComponent(serviceId)}`, {
        name: String(form.get("name")),
        description: String(form.get("description")),
        duration: Number(form.get("duration")),
        price: Number(form.get("price")),
      });
      await refreshShop(shop.id);
      setNotice("Service updated.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update this service."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(serviceId: string) {
    if (!shop) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.delete(`/shops/${encodeURIComponent(shop.id)}/services/${encodeURIComponent(serviceId)}`);
      await refreshShop(shop.id);
      setNotice("Service removed.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to remove this service."));
    } finally {
      setSaving(false);
    }
  }

  async function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.post(`/shops/${encodeURIComponent(shop.id)}/staff`, {
        name: String(form.get("name")),
        role: String(form.get("role")),
      });
      await refreshShop(shop.id);
      formElement.reset();
      setNotice("Team member added.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to add this team member."));
    } finally {
      setSaving(false);
    }
  }

  async function updateStaff(event: FormEvent<HTMLFormElement>, staffId: string) {
    event.preventDefault();
    if (!shop) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.patch(`/shops/${encodeURIComponent(shop.id)}/staff/${encodeURIComponent(staffId)}`, {
        name: String(form.get("name")),
        role: String(form.get("role")),
      });
      await refreshShop(shop.id);
      setNotice("Team member updated.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to update this team member."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteStaff(staffId: string) {
    if (!shop) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.delete(`/shops/${encodeURIComponent(shop.id)}/staff/${encodeURIComponent(staffId)}`);
      await refreshShop(shop.id);
      setNotice("Team member removed.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to remove this team member."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="dashboard-card"><p>Loading your shop workspace…</p></section>;

  return (
    <>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!shops.length ? (
        <section className="dashboard-card">
          <span className="eyebrow">GET YOUR BUSINESS ON TRIMLY</span>
          <h2>Create your shop</h2>
          <p>Your shop profile is the home for your services, team and bookings.</p>
          <form className="owner-form" onSubmit={createShop}>
            <label className="input-label" htmlFor="new-shop-name">Shop name</label>
            <input className="text-input" id="new-shop-name" name="name" minLength={2} maxLength={120} required />
            <label className="input-label" htmlFor="new-shop-location">Neighborhood</label>
            <input className="text-input" id="new-shop-location" name="location" minLength={2} maxLength={120} required />
            <label className="input-label" htmlFor="new-shop-address">Street address</label>
            <input className="text-input" id="new-shop-address" name="address" minLength={2} maxLength={240} required />
            <label className="input-label" htmlFor="new-shop-category">Category</label>
            <input className="text-input" id="new-shop-category" name="category" placeholder="Barbershop or salon" minLength={2} maxLength={80} required />
            <label className="input-label" htmlFor="new-shop-image">Cover gradient</label>
            <input className="text-input" id="new-shop-image" name="image" placeholder="Optional CSS gradient" maxLength={500} />
            <button className="button" type="submit" disabled={saving}>{saving ? "Creating…" : "Create shop"} <span>→</span></button>
          </form>
        </section>
      ) : (
        <>
          <div className="dashboard-card-heading">
            <div><span className="eyebrow">SHOP WORKSPACE</span><h2>Manage your business</h2></div>
            <label className="input-label" htmlFor="owner-shop-select">Shop</label>
            <select id="owner-shop-select" className="text-input" value={selectedShopId} onChange={(event) => setSelectedShopId(event.target.value)}>
              {shops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          {shop && (
            <>
              <section className="dashboard-card">
                <h3>Shop profile</h3>
                <form className="owner-form" key={`profile-${shop.id}`} onSubmit={updateShop}>
                  <label className="input-label" htmlFor="shop-name">Shop name</label>
                  <input className="text-input" id="shop-name" name="name" defaultValue={shop.name} required />
                  <label className="input-label" htmlFor="shop-location">Neighborhood</label>
                  <input className="text-input" id="shop-location" name="location" defaultValue={shop.location} required />
                  <label className="input-label" htmlFor="shop-address">Address</label>
                  <input className="text-input" id="shop-address" name="address" defaultValue={shop.address} required />
                  <label className="input-label" htmlFor="shop-category">Category</label>
                  <input className="text-input" id="shop-category" name="category" defaultValue={shop.category} required />
                  <label className="input-label" htmlFor="shop-image">Cover gradient</label>
                  <input className="text-input" id="shop-image" name="image" defaultValue={shop.image} required />
                  <button className="button" type="submit" disabled={saving}>Save profile</button>
                </form>
              </section>

              <section className="dashboard-card">
                <div className="dashboard-card-heading"><div><span className="eyebrow">WHAT YOU OFFER</span><h2>Services</h2></div></div>
                {shop.services.map((service) => (
                  <form className="owner-item-form" key={service.id} onSubmit={(event) => updateService(event, service.id)}>
                    <input className="text-input" aria-label="Service name" name="name" defaultValue={service.name} required />
                    <input className="text-input" aria-label="Service description" name="description" defaultValue={service.description} required />
                    <input className="text-input" aria-label="Duration in minutes" name="duration" type="number" min="5" max="480" defaultValue={service.duration} required />
                    <input className="text-input" aria-label="Price in KES" name="price" type="number" min="1" defaultValue={service.price} required />
                    <button className="quiet-button" type="submit" disabled={saving}>Save</button>
                    <button className="quiet-button" type="button" disabled={saving} onClick={() => deleteService(service.id)}>Remove</button>
                  </form>
                ))}
                <form className="owner-item-form" onSubmit={addService}>
                  <input className="text-input" aria-label="New service name" name="name" placeholder="Service name" required />
                  <input className="text-input" aria-label="New service description" name="description" placeholder="Description" required />
                  <input className="text-input" aria-label="New service duration" name="duration" type="number" min="5" max="480" placeholder="Minutes" required />
                  <input className="text-input" aria-label="New service price" name="price" type="number" min="1" placeholder="KES" required />
                  <button className="button" type="submit" disabled={saving}>Add service</button>
                </form>
              </section>

              <section className="dashboard-card">
                <div className="dashboard-card-heading"><div><span className="eyebrow">YOUR PEOPLE</span><h2>Team</h2></div></div>
                {shop.staff.map((member) => (
                  <form className="owner-item-form" key={member.id} onSubmit={(event) => updateStaff(event, member.id)}>
                    <input className="text-input" aria-label="Team member name" name="name" defaultValue={member.name} required />
                    <input className="text-input" aria-label="Team member role" name="role" defaultValue={member.role} required />
                    <button className="quiet-button" type="submit" disabled={saving}>Save</button>
                    <button className="quiet-button" type="button" disabled={saving} onClick={() => deleteStaff(member.id)}>Remove</button>
                  </form>
                ))}
                <form className="owner-item-form" onSubmit={addStaff}>
                  <input className="text-input" aria-label="New team member name" name="name" placeholder="Name" required />
                  <input className="text-input" aria-label="New team member role" name="role" placeholder="Role" required />
                  <button className="button" type="submit" disabled={saving}>Add team member</button>
                </form>
              </section>

              <section className="dashboard-card">
                <div className="dashboard-card-heading"><div><span className="eyebrow">YOUR CALENDAR</span><h2>Bookings</h2></div></div>
                {bookings.length ? (
                  <div className="appointment-list">
                    {bookings.map((booking) => (
                      <article className="appointment-row" key={booking.reference}>
                        <span className="appointment-date">✳</span>
                        <div className="appointment-details">
                          <strong>{booking.serviceName}</strong>
                          <span>{booking.customerName} · {booking.customerEmail} · {booking.stylistName}</span>
                          <small>{booking.date} at {booking.time}</small>
                        </div>
                        <span className="confirmed-tag">{booking.status.toLowerCase().replaceAll("_", " ")}</span>
                      </article>
                    ))}
                  </div>
                ) : <p>No bookings for this shop yet.</p>}
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
