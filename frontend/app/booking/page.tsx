import BookingLoader from "./booking-loader";

type BookingSearchParams = { shop?: string; service?: string; stylist?: string };

export default async function BookingPage({ searchParams }: { searchParams: Promise<BookingSearchParams> }) {
  const query = await searchParams;
  return <BookingLoader shopId={query.shop ?? "the-groom-room"} serviceId={query.service} stylistId={query.stylist} />;
}
