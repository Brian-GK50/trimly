import type { Barber } from "@/types";

export default function BarberCard({ barber, selected, onSelect }: {
  barber: Barber;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`barber-option${selected ? " selected" : ""}`} onClick={onSelect}>
      <span className={`avatar avatar-${barber.initials.charCodeAt(0) % 4}`}>{barber.initials}</span>
      <span className="barber-info"><strong>{barber.name}</strong><small>{barber.role}</small><small className="barber-rating">★ {barber.rating}</small></span>
      <span className="service-radio" aria-hidden="true">{selected ? "✓" : ""}</span>
    </button>
  );
}
