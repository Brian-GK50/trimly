"use client";

import { useEffect, useRef, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";

type PaymentStatus = "idle" | "submitting" | "pending" | "complete" | "failed" | "refund" | "error" | "timeout";

export default function MpesaModal({ bookingId, amount, onClose, onPaid }: {
  bookingId: string;
  amount: number;
  onClose: () => void;
  onPaid: (reference: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [message, setMessage] = useState("");
  const startedAt = useRef(0);

  useEffect(() => {
    if (status !== "pending" || !paymentId) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    async function checkPayment() {
      if (Date.now() - startedAt.current > 120_000) {
        setStatus("timeout");
        setMessage("We’re still waiting for M-PESA. Check your bookings shortly before trying again.");
        return;
      }

      try {
        const { data } = await api.get<{ payment: { status: string; reference: string } }>(`/payments/${paymentId}`);
        if (cancelled) return;

        if (data.payment.status === "completed") {
          setStatus("complete");
          onPaid(data.payment.reference);
        } else if (data.payment.status === "refund_required") {
          setStatus("refund");
          setMessage("Payment was received after the booking hold expired. Please contact the shop to arrange a refund.");
        } else if (data.payment.status === "failed") {
          setStatus("failed");
          setMessage("The payment was not completed. Your appointment slot has been released.");
        } else {
          timeout = setTimeout(checkPayment, 3000);
        }
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(getApiErrorMessage(error, "Unable to check payment status."));
      }
    }

    timeout = setTimeout(checkPayment, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [onPaid, paymentId, status]);

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const { data } = await api.post<{ payment: { id: string } }>("/payments/mpesa", {
        bookingId,
        phone,
      });
      startedAt.current = Date.now();
      setPaymentId(data.payment.id);
      setStatus("pending");
      setMessage(`M-PESA prompt sent to ${phone}. Approve it on your phone to confirm your booking.`);
    } catch (error) {
      setStatus("error");
      setMessage(getApiErrorMessage(error, "Unable to send the M-PESA prompt."));
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="mpesa-mark">M</span>
        <p className="eyebrow">SECURE CHECKOUT</p>
        <h2 id="payment-title">{status === "pending" ? "Check your phone" : "Pay your deposit"}</h2>
        <p className="modal-copy">We’ll send an M-PESA prompt to your phone. Confirm it to lock in your appointment.</p>
        <div className="deposit-due"><span>Due now</span><strong>KES {amount.toLocaleString("en-KE")}</strong></div>
        {status === "idle" || status === "submitting" || status === "error" ? (
          <form onSubmit={submitPayment}>
            <label className="input-label" htmlFor="mpesa-phone">M-PESA phone number</label>
            <input id="mpesa-phone" className="text-input" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="07XX XXX XXX" required pattern="[0-9 +()-]{9,20}" autoComplete="tel" />
            {message && <p className="booking-error" role="alert">{message}</p>}
            <button className="button button-wide" type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Sending prompt…" : "Send payment prompt"} <span>→</span></button>
          </form>
        ) : (
          <>
            <p className={status === "failed" || status === "refund" ? "booking-error" : "modal-copy"} role={status === "failed" || status === "refund" ? "alert" : "status"}>
              {message || (status === "complete" ? "Payment confirmed." : "")}
            </p>
            {status !== "pending" && <button className="button button-wide" type="button" onClick={onClose}>Close</button>}
          </>
        )}
        <p className="secure-note">🔒 Your payment is processed securely</p>
      </section>
    </div>
  );
}
