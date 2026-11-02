import Link from "next/link";

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="brand" href="/" aria-label="Trimly home">
          <span className="brand-mark">t.</span>
          trimly
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/shops">Explore shops</Link>
          <Link href="/dashboard">For shop owners</Link>
        </nav>
        <div className="nav-actions">
          <Link className="nav-login" href="/login">Log in</Link>
          <Link className="button button-small" href="/register">Get started</Link>
        </div>
      </div>
    </header>
  );
}
