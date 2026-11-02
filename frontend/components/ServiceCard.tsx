import type { Service } from "@/types";
import { formatPrice } from "@/lib/data";

export default function ServiceCard({ service, selected, onSelect }: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`service-option${selected ? " selected" : ""}`} onClick={onSelect}>
      <span className="service-radio" aria-hidden="true">{selected ? "✓" : ""}</span>
      <span className="service-copy">
        <strong>{service.name}</strong>
        <span>{service.description}</span>
        <small>{service.duration} min</small>
      </span>
      <strong className="service-price">{formatPrice(service.price)}</strong>
    </button>
  );
}
