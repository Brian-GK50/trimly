export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
};

export type Barber = {
  id: string;
  name: string;
  role: string;
  initials: string;
  rating: number;
};

export type Shop = {
  id: string;
  name: string;
  location: string;
  address: string;
  rating: number;
  reviews: number;
  category: string;
  open: string;
  image: string;
  services: Service[];
  staff: Barber[];
};
