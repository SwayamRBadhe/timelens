import type { Metadata } from "next";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/source-sans-3";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
export const metadata: Metadata = {
  title: { default: "TimeLens — See the world on any day in history", template: "%s | TimeLens" },
  description:
    "Explore a cross-section of history by date, region, and category. Discover what else was happening in the world.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
