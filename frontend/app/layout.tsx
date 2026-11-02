import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trimly — your next great cut",
  description: "Discover great barbers and salons. Book your next appointment with Trimly.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Navbar />{children}<footer className="site-footer"><div className="footer-inner"><span className="brand"><span className="brand-mark">t.</span>trimly</span><span>Good hair days, made easy.</span><span>© 2026 Trimly</span></div></footer></body></html>;
}
