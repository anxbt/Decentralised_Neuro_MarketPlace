import React from "react";
import { Link } from "react-router-dom";
import EEGWaveform from "@/components/EEGWaveform";
import { Lock, HardDrive, FlaskConical } from "lucide-react";

const features = [
  {
    icon: Lock,
    label: "ENCRYPTION",
    heading: "Buyer-only decryption",
    body: "Access control enforced on-chain via Lit Protocol. Only the wallet that purchased can decrypt.",
  },
  {
    icon: HardDrive,
    label: "STORAGE",
    heading: "Permanent on Filecoin",
    body: "Every dataset pinned to IPFS. Verifiable CID included with every purchase. Persists indefinitely.",
  },
  {
    icon: FlaskConical,
    label: "DATA QUALITY",
    heading: "PhysioNet-sourced",
    body: "Datasets sourced from validated peer-reviewed EEG studies. Citable and annotated.",
  },
];

const Index: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="hero-gradient relative flex min-h-[80vh] flex-col items-center justify-center px-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <p className="label-uppercase text-[11px] text-primary" style={{ letterSpacing: "0.1em" }}>
            FILECOIN × LIT PROTOCOL
          </p>

          <h1 className="mt-5 font-heading text-[60px] font-bold leading-[1.1] text-foreground">
            Neural data belongs<br />to researchers.
          </h1>

          <p className="mt-6 max-w-[500px] font-mono text-sm leading-[1.7] text-muted-foreground">
            NeuroMarket is an encrypted marketplace for EEG datasets. List your data, set your price,
            and let verified buyers decrypt — with no middlemen.
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              to="/marketplace"
              className="rounded-[3px] bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent-dim"
            >
              Browse Datasets
            </Link>
            <Link
              to="/upload"
              className="rounded-[3px] border border-border bg-transparent px-6 py-2.5 font-mono text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              List a Dataset
            </Link>
          </div>

          <div className="mt-12 opacity-80">
            <EEGWaveform variant="hero" />
          </div>

          <p className="mt-6 font-mono text-xs text-text-tertiary">
            847 datasets · $124,320 paid to researchers · 100% encrypted
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-6 py-20 md:grid-cols-3" style={{ paddingTop: 80 }}>
          {features.map((f) => (
            <div key={f.label}>
              <f.icon size={18} className="text-primary" fill="currentColor" />
              <p className="label-uppercase mt-4 text-[10px] text-primary" style={{ letterSpacing: "0.1em" }}>
                {f.label}
              </p>
              <h3 className="mt-2 font-heading text-[15px] font-semibold text-foreground">{f.heading}</h3>
              <p className="mt-2 font-mono text-[13px] leading-[1.6] text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
