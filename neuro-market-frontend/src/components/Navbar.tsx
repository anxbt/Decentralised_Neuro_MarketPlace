import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from '@rainbow-me/rainbowkit';

const navItems = [
  { label: "Marketplace", path: "/marketplace" },
  { label: "List Dataset", path: "/upload" },
  { label: "Verify", path: "/verify" },
  { label: "Dashboard", path: "/dashboard" },
];

const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="heading-wide text-sm font-bold text-foreground" style={{ letterSpacing: "0.12em" }}>
          NEUROMARKET
        </Link>

        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`font-mono text-[13px] transition-colors ${
                  active ? "text-foreground border-b-[1px] border-primary pb-0.5" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div>
          <ConnectButton 
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
