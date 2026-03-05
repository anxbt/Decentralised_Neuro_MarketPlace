import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Loader2 } from "lucide-react";
import { fetchResearcherDatasets, type Dataset as ApiDataset } from "@/lib/api";
import { onDatasetPurchasedByBuyer, formatPrice } from "@/lib/contract";
import { toast } from "sonner";

interface PurchasedDataset {
  datasetId: string;
  name: string;
  date: string;
  cid: string;
  price: string;
}

const Dashboard: React.FC = () => {
  const { isConnected, address, setShowConnectModal } = useWallet();
  const [activeTab, setActiveTab] = useState<"listings" | "purchased">("listings");
  const [listings, setListings] = useState<ApiDataset[]>([]);
  const [purchased, setPurchased] = useState<PurchasedDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch researcher's datasets from backend
  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    const loadResearcherData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`[Dashboard] Fetching datasets for researcher: ${address}`);

        // Fetch datasets uploaded by this researcher
        const datasets = await fetchResearcherDatasets(address);
        setListings(datasets);

        console.log(`[Dashboard] Loaded ${datasets.length} datasets for researcher ${address}`);
        
        if (datasets.length === 0) {
          console.log(`[Dashboard] No datasets found. Make sure you uploaded datasets with this wallet address: ${address}`);
        } else {
          console.log(`[Dashboard] Datasets:`, datasets.map(d => ({ id: d.id, title: d.title, researcher: d.researcher_address })));
        }
      } catch (err) {
        console.error("[Dashboard] Error loading researcher data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        toast.error("Failed to load your datasets");
      } finally {
        setLoading(false);
      }
    };

    loadResearcherData();
  }, [isConnected, address]);

  // Listen for purchases made by this wallet
  useEffect(() => {
    if (!isConnected || !address) {
      return;
    }

    // Listen for DatasetPurchased events where this address is the buyer
    const unsubscribe = onDatasetPurchasedByBuyer(
      address,
      (datasetId, buyer, researcher, price) => {
        console.log(`Purchase detected: ${datasetId} by ${buyer}`);
        
        // Add to purchased list
        setPurchased(prev => {
          // Check if already in list
          if (prev.some(p => p.datasetId === datasetId)) {
            return prev;
          }

          return [
            ...prev,
            {
              datasetId,
              name: datasetId, // Will be replaced with actual name from backend
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              cid: '', // Will be fetched from contract if needed
              price: formatPrice(price)
            }
          ];
        });

        toast.success("Dataset purchased successfully!");
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isConnected, address]);

  // Calculate stats from listings
  const stats = React.useMemo(() => {
    const totalSales = listings.reduce((sum, dataset) => sum + dataset.purchase_count, 0);
    const totalEarned = listings.reduce((sum, dataset) => {
      const price = parseFloat(dataset.price);
      return sum + (price * dataset.purchase_count);
    }, 0);

    return [
      { label: "TOTAL EARNED", value: `${totalEarned.toFixed(2)} tFIL`, orange: true },
      { label: "DATASETS LISTED", value: listings.length.toString(), orange: false },
      { label: "PURCHASED", value: purchased.length.toString(), orange: false },
      { label: "TOTAL SALES", value: totalSales.toString(), orange: false },
    ];
  }, [listings, purchased]);

  if (!isConnected) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1200px] flex-col items-center justify-center px-6 py-20">
        <p className="font-mono text-sm text-muted-foreground">Connect your wallet to view dashboard</p>
        <button
          onClick={() => setShowConnectModal(true)}
          className="mt-4 rounded-[3px] bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] px-6 py-10">
      {/* Wallet bar */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-[13px] text-foreground">{address}</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-badge-green">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-badge-green" />
          Calibration Testnet
        </span>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[4px] border border-border bg-card p-5">
            <p className="label-uppercase text-[10px] text-text-tertiary">{s.label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold ${s.orange ? "text-primary" : "text-foreground"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-6 border-b border-border">
        {(["listings", "purchased"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-mono text-[13px] transition-colors ${
              activeTab === tab
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "listings" ? "My Listings" : "Purchased Datasets"}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="mt-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 font-mono text-sm text-muted-foreground">Loading from blockchain...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="mt-12 rounded-[4px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="font-mono text-sm text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-[3px] border border-primary px-4 py-2 font-mono text-xs text-primary hover:bg-primary/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="mt-1">
          {activeTab === "listings" && (
            <>
              {listings.length === 0 ? (
                <div className="mt-12 text-center">
                  <p className="font-mono text-sm text-muted-foreground">No datasets listed yet</p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    Datasets must be uploaded with wallet: {address?.substring(0, 10)}...{address?.substring(address.length - 8)}
                  </p>
                  <a
                    href="/upload"
                    className="mt-4 inline-block rounded-[3px] bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
                  >
                    List Your First Dataset
                  </a>
                </div>
              ) : (
                listings.map((dataset) => {
                  const earned = (parseFloat(dataset.price) * dataset.purchase_count).toFixed(2);
                  return (
                    <div
                      key={dataset.id}
                      className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle py-4"
                    >
                      <span className="font-mono text-xs text-foreground">{dataset.title}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        CID: {dataset.cid.substring(0, 12)}...
                      </span>
                      <span className="font-mono text-xs text-primary">{dataset.price} tFIL</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {dataset.purchase_count} sales
                      </span>
                      <span className="font-mono text-xs text-primary">{earned} tFIL earned</span>
                      <span
                        className="rounded-[2px] border px-2 py-0.5 font-mono text-[9px] uppercase text-badge-green"
                        style={{
                          borderColor: "rgba(74,222,128,0.25)",
                          backgroundColor: "rgba(74,222,128,0.08)",
                        }}
                      >
                        ACTIVE
                      </span>
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === "purchased" && (
            <>
              {purchased.length === 0 ? (
                <div className="mt-12 text-center">
                  <p className="font-mono text-sm text-muted-foreground">No datasets purchased yet</p>
                  <a
                    href="/marketplace"
                    className="mt-4 inline-block rounded-[3px] bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
                  >
                    Browse Marketplace
                  </a>
                </div>
              ) : (
                purchased.map((p) => (
                  <div
                    key={p.datasetId}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle py-4"
                  >
                    <span className="font-mono text-xs text-foreground">{p.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{p.date}</span>
                    <span className="font-mono text-xs text-primary">{p.price} tFIL</span>
                    <button className="rounded-[3px] border border-primary px-3 py-1.5 font-mono text-xs text-primary transition-colors hover:bg-primary/10">
                      Decrypt & Download →
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
