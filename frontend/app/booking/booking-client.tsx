"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import BarberCard from "@/components/BarberCard";
import BookingCalendar, { getFirstAvailableTime, getFirstBookableDate } from "@/components/BookingCalendar";
import MpesaModal from "@/components/MpesaModal";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/data";
import type { Barber, Service, Shop } from "@/types";

export default function BookingClient({ shop, service, stylist }: { shop: Shop; service: Service; stylist: Barber }) {
  const [selectedStylist, setSelectedStylist] = useState(stylist);
  const [date, setDate] = useState(() => getFirstBookableDate());
  const [time, setTime] = useState(() => getFirstAvailableTime(getFirstBookableDate()));
  const [showPayment, setShowPayment] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const router = useRouter();
  const deposit = Math.round(service.price * 0.25);

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    setTime(getFirstAvailableTime(nextDate));
  }

  useEffect(() => {
    setSelectedStylist(stylist);
  }, [stylist]);

  async function beginPayment() {
    setCreatingBooking(true);
    setBookingError("");
    try {
      const { data } = await api.post<{ booking: { id: string } }>("/bookings", {
        shopId: shop.id,
        serviceId: service.id,
        staffId: selectedStylist.id,
        startsAt: getAppointmentStart(date, time),
      });
      setBookingId(data.booking.id);
      setShowPayment(true);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const next = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
      } else {
        setBookingError(getApiErrorMessage(error, "Unable to reserve this appointment"));
      }
    } finally {
      setCreatingBooking(false);
    }
  }

  function confirmBooking(reference: string) {
    setShowPayment(false);
    router.push(`/booking/confirmed?ref=${encodeURIComponent(reference)}`);
  }

  const canSubmitBooking = Boolean(selectedStylist?.id) && Boolean(shop?.id) && Boolean(service?.id);

  return (
    <main className="page-shell booking-page">
      <Link className="back-link" href={`/shops/${shop.id}`}>← Back to {shop.name}</Link>
      <div className="booking-intro"><span className="eyebrow">ONE LAST THING</span><h1>Make it <em>official.</em></h1><p>Pick a time that works. We’ll save you a seat.</p></div>
      <div className="booking-layout">
        <section className="booking-main">
          <div className="booking-step-heading"><span>01</span><div><h2>Choose your stylist</h2><p>Every good cut starts with good hands.</p></div></div>
          <div className="booking-staff">{shop.staff.map((person) => <BarberCard key={person.id} barber={person} selected={selectedStylist.id === person.id} onSelect={() => setSelectedStylist(person)} />)}</div>
          <div className="booking-step-heading calendar-heading"><span>02</span><div><h2>Find your time</h2><p>Pick a day and a time. Easy.</p></div></div>
          <BookingCalendar date={date} time={time} onDateChange={handleDateChange} onTimeChange={setTime} />
        </section>
        <aside className="booking-summary">
          <span className="eyebrow">YOUR APPOINTMENT</span>
          <h3>{shop.name}</h3>
          <p className="shop-location">⌖ {shop.location}</p>
          <div className="summary-divider" />
          <div className="summary-line"><span>Service</span><strong>{service.name}</strong></div>
          <div className="summary-line"><span>With</span><strong>{selectedStylist.name}</strong></div>
          <div className="summary-line"><span>Date</span><strong>{formatSelectedDate(date)}</strong></div>
          <div className="summary-line"><span>Time</span><strong>{time}</strong></div>
          <div className="summary-divider" />
          <div className="summary-line"><span>Total service</span><strong>{formatPrice(service.price)}</strong></div>
          <div className="deposit-line"><span>Deposit due now <small>25% to secure your spot</small></span><strong>{formatPrice(deposit)}</strong></div>
          {bookingError && <p className="booking-error" role="alert">{bookingError}</p>}
          <button type="button" className="button button-wide summary-button" disabled={creatingBooking || !canSubmitBooking} onClick={beginPayment}>{creatingBooking ? "Checking availability…" : "Pay deposit with M-PESA"} <span>→</span></button>
          <p className="summary-footnote">The remaining {formatPrice(service.price - deposit)} is paid at the shop. Free cancellation up to 24 hours before.</p>
          <div className="safe-booking">♡ <span><strong>Your spot is held with care.</strong><br />No charge until you approve the M-PESA prompt.</span></div>
        </aside>
      </div>
      {showPayment && <MpesaModal bookingId={bookingId} amount={deposit} onClose={() => setShowPayment(false)} onPaid={confirmBooking} />}
    </main>
  );
}

function getAppointmentStart(day: string, time: string): string {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(time);
  if (!match) throw new Error("Choose a valid appointment time");

  const [, hourText, minute, period] = match;
  const hour = (Number(hourText) % 12) + (period === "PM" ? 12 : 0);
  const localDateTime = `${day}T${String(hour).padStart(2, "0")}:${minute}:00+03:00`;
  return new Date(localDateTime).toISOString();
}

function formatSelectedDate(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}
