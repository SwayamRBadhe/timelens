import Link from "next/link";
import { Aperture, Search, ArrowUpRight } from "lucide-react";
export function Header() {
  return (
    <header className="site-header shell">
      <Link href="/" className="brand" aria-label="TimeLens home">
        <Aperture size={27} strokeWidth={1.4} />
        TimeLens<span className="brand-period">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/search">
          <Search size={16} /> <span>Search the archive</span>
        </Link>
        <Link href="/#about" className="about-link">
          About the project <ArrowUpRight size={15} />
        </Link>
      </nav>
    </header>
  );
}
