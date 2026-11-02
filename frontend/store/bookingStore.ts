import { create } from "zustand";

export interface SavedBooking {
  reference: string;
  shopName: string;
  serviceName: string;
  staffId: string;
  stylistName: string;
  date: string;
  time: string;
  total: number;
  deposit: number;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
}

interface BookingStore {
  serviceId: string;
  barberId: string;
  date: string;
  time: string;

  setServiceId: (id: string) => void;
  setBarberId: (id: string) => void;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
}

export const useBookingStore =
create<BookingStore>((set) => ({
  serviceId: "",
  barberId: "",
  date: "",
  time: "",

  setServiceId: (id) => set({ serviceId: id }),
  setBarberId: (id) => set({ barberId: id }),
  setDate: (date) => set({ date }),
  setTime: (time) => set({ time }),
}));