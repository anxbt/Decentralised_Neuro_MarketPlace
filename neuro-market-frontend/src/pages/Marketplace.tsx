import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import EEGWaveform from "@/components/EEGWaveform";
import PDPProofBadge from "@/components/PDPProofBadge";
import { fetchDatasets, type Dataset as ApiDataset } from "@/lib/api";
import { CONTRACT_ADDRESS, NEURO_MARKETPLACE_ABI } from "@/lib/contract";
import { toast } from "sonner";

// Map backend dataset to display format
interface DisplayDataset {
  id: string;
  name: string;
  type: string;
  channels: number;
  duration: string;
  sampleRate: string;
  fileSize: string;
  price: string;
  researcher: string;
  institution: string;
  purchases: number;
  description: string;
  cid: string;
  listedDate: string;
}

const Marketplace: React.FC = () => {
  const [activeType, setActiveType] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [datasets, setDatasets] = useState<DisplayDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract unique dataset types from loaded datasets
  const datasetTypes = useMemo(() => {
    const types = new Set(datasets.map(d => d.type));
    return ["All", ...Array.from(types).sort()];
  }, [datasets]);

  // Fetch datasets from backend API
  useEffect(() => {
    const loadDatasets = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiDatasets = await fetchDatasets();
        
        // Transform API datasets to display format
        const displayDatasets: DisplayDataset[] = apiDatasets.map((dataset: ApiDataset) => {
          // Parse description to extract metadata (if stored in JSON format)
          let metadata = {
            type: "EEG Dataset",
            channels: 32,
            duration: "N/A",
            sampleRate: "256 Hz",
            fileSize: "N/A",
            institution: "Research Lab"
          };

          try {
            // Try to parse description as JSON for metadata
            const parsed = JSON.parse(dataset.description);
            if (parsed.type) metadata.type = parsed.type;
            if (parsed.channels) metadata.channels = parsed.channels;
            if (parsed.duration) metadata.duration = parsed.duration;
            if (parsed.sampleRate) metadata.sampleRate = parsed.sampleRate;
            if (parsed.fileSize) metadata.fileSize = parsed.fileSize;
            if (parsed.institution) metadata.institution = parsed.institution;
          } catch {
            // If not JSON, use description as-is
          }

          return {
            id: dataset.id,
            name: dataset.title,
            type: metadata.type,
            channels: metadata.channels,
            duration: metadata.duration,
            sampleRate: metadata.sampleRate,
            fileSize: metadata.fileSize,
            price: dataset.price,
            researcher: dataset.researcher_address.substring(0, 6) + "..." + dataset.researcher_address.substring(38),
            institution: metadata.institution,
            purchases: dataset.purchase_count,
            description: typeof dataset.description === 'string' && !dataset.description.startsWith('{') 
              ? dataset.description 
              : dataset.title,
            cid: dataset.cid,
            listedDate: new Date(dataset.upload_date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })
          };
        });

        setDatasets(displayDatasets);
        console.log(`Loaded ${displayDatasets.length} datasets from backend`);
      } catch (err) {
        console.error("Error loading datasets from backend, trying on-chain fallback:", err);

        // On-chain event fallback — read DatasetRegistered events from the contract
        try {
          const { ethers } = await import("ethers");
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, NEURO_MARKETPLACE_ABI, provider);

            // Query last 10,000 blocks for DatasetRegistered events
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            const events = await contract.queryFilter("DatasetRegistered", fromBlock, currentBlock);

            const onChainDatasets: DisplayDataset[] = events.map((event: any) => {
              const args = event.args;
              return {
                id: args.datasetId || "unknown",
                name: args.datasetId || "On-chain Dataset",
                type: "EEG Dataset",
                channels: 32,
                duration: "N/A",
                sampleRate: "256 Hz",
                fileSize: "N/A",
                price: ethers.formatEther(args.price || 0),
                researcher: (args.researcher || "").substring(0, 6) + "..." + (args.researcher || "").substring(38),
                institution: "On-chain Record",
                purchases: 0,
                description: "Loaded from on-chain events (backend unavailable)",
                cid: args.cid || "",
                listedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              };
            });

            setDatasets(onChainDatasets);
            console.log(`Loaded ${onChainDatasets.length} datasets from on-chain events (fallback)`);
            toast.info("Backend unavailable — showing on-chain data");
          } else {
            throw new Error("No wallet connected for on-chain fallback");
          }
        } catch (chainErr) {
          console.error("On-chain fallback also failed:", chainErr);
          setError("Failed to load datasets from backend and on-chain");
          toast.error("Failed to load marketplace datasets");
        }
      } finally {
        setLoading(false);
      }
    };

    loadDatasets();
  }, []);

  const filtered = useMemo(() => {
    let result = datasets;
    if (activeType !== "All") result = result.filter((d) => d.type === activeType);
    if (search) result = result.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.researcher.toLowerCase().includes(search.toLowerCase()));
    if (sort === "price-low") result = [...result].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    if (sort === "price-high") result = [...result].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    if (sort === "newest") result = [...result].sort((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime());
    return result;
  }, [datasets, activeType, search, sort]);

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <h1 className="font-heading text-[22px] font-bold text-foreground">Datasets</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search datasets..."
              className="rounded-[4px] border border-border bg-card py-2 pl-9 pr-3.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-[4px] border border-border bg-card px-3.5 py-2 font-mono text-[13px] text-foreground focus:border-primary focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low</option>
            <option value="price-high">Price: High</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {datasetTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`rounded-[3px] border px-3 py-1 font-mono text-[11px] transition-colors ${
              activeType === type
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mt-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 font-mono text-sm text-muted-foreground">Loading datasets from blockchain...</span>
        </div>
      )}

      {/* Error State */}
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

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="mt-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            {datasets.length === 0 ? "No datasets available yet" : "No datasets match your filters"}
          </p>
          {datasets.length === 0 && (
            <a
              href="/upload"
              className="mt-4 inline-block rounded-[3px] bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
            >
              List the First Dataset
            </a>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dataset) => (
            <Link
              key={dataset.id}
              to={`/dataset/${dataset.id}`}
              className="group overflow-hidden rounded-[4px] border border-border bg-card transition-colors hover:border-primary/30 hover:bg-surface-raised"
            >
              <div className="bg-background">
                <EEGWaveform variant="card" />
              </div>
              <div className="p-5">
                <div className="flex gap-2">
                  <span className="rounded-[3px] border border-border px-2 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                    {dataset.type}
                  </span>
                  <span className="rounded-[3px] border px-2 py-0.5 font-mono text-[9px] uppercase text-badge-green" style={{ borderColor: "rgba(74,222,128,0.3)", backgroundColor: "rgba(74,222,128,0.06)" }}>
                    🔐 Encrypted
                  </span>
                </div>

                <h3 className="mt-3 font-heading text-[15px] font-semibold text-foreground">{dataset.name}</h3>
                <p className="mt-1 font-mono text-[11px] text-text-tertiary">
                  {dataset.researcher} · {dataset.institution}
                </p>
                <p className="mt-2 line-clamp-2 font-mono text-xs leading-[1.6] text-muted-foreground">
                  {dataset.description}
                </p>

                <div className="mt-4 border-t border-dashed border-border-subtle pt-4">
                  <p className="font-mono text-[11px] text-text-tertiary">
                    {dataset.channels} ch · {dataset.duration} · {dataset.sampleRate} · {dataset.fileSize}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-text-tertiary">
                    CID: {dataset.cid.substring(0, 12)}...
                  </p>
                  {dataset.cid && (
                    <div className="mt-2">
                      <PDPProofBadge pieceCid={dataset.cid} compact={true} />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm text-primary">{dataset.price} tFIL</span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {dataset.purchases} sales
                    </span>
                  </div>
                  <span className="rounded-[3px] bg-primary px-3 py-1.5 font-heading text-xs font-semibold text-primary-foreground">
                    Buy & Decrypt →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
