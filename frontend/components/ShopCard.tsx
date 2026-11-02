import Link from "next/link";
import type { Shop } from "@/types";

export default function ShopCard({ shop }: { shop: Shop }) {
  return (
    <article className="shop-card">
      <Link className="shop-image" href={`/shops/${shop.id}`} style={{ background: shop.image }} aria-label={`View ${shop.name}`}>
        <span className="image-label">{shop.category}</span>
        <span className="image-sparkle">✳</span>
      </Link>
      <div className="shop-card-body">
        <div className="shop-card-heading">
          <Link href={`/shops/${shop.id}`} className="shop-name">{shop.name}</Link>
          <span className="rating">★ {shop.rating}</span>
        </div>
        <p className="shop-location">{shop.location} <span>·</span> {shop.reviews} reviews</p>
        <div className="shop-card-bottom">
          <span className="open-status"><i /> {shop.open}</span>
          <Link className="text-link" href={`/shops/${shop.id}`}>View shop <span>↗</span></Link>
        </div>
      </div>
    </article>
  );
}
