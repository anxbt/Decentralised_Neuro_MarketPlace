import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";
import { fetchDatasetById, type Dataset as ApiDataset } from "@/lib/api";
import { hasAccess } from "@/lib/contract";
import EEGWaveform from "@/components/EEGWaveform";
import PurchaseModal from "@/components/PurchaseModal";
import PDPProofBadge from "@/components/PDPProofBadge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const DatasetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isConnected, address, setShowConnectModal } = useWallet();
  const [showPurchase, setShowPurchase] = useState(false);
  const [dataset, setDataset] = useState<ApiDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccessToDataset, setHasAccessToDataset] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // Fetch dataset from backend
  useEffect(() => {
    const loadDataset = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDatasetById(id);
        setDataset(data);
      } catch (err) {
        console.error("Error loading dataset:", err);
        setError(err instanceof Error ? err.message : "Failed to load dataset");
        toast.error("Failed to load dataset details");
      } finally {
        setLoading(false);
      }
    };

    loadDataset();
  }, [id]);

  // Check if user has access to this dataset
  useEffect(() => {
    const checkAccess = async () => {
      if (!dataset || !isConnected || !address) {
        setHasAccessToDataset(false);
        return;
      }

      try {
        setCheckingAccess(true);
        const access = await hasAccess(dataset.id, address);
        setHasAccessToDataset(access);
      } catch (err) {
        console.error("Error checking access:", err);
        setHasAccessToDataset(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [dataset, isConnected, address]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 font-mono text-sm text-muted-foreground">Loading dataset...</span>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <p className="font-mono text-sm text-red-500">{error || "Dataset not found"}</p>
        <a
          href="/marketplace"
          className="mt-4 inline-block rounded-[3px] border border-primary px-4 py-2 font-mono text-xs text-primary hover:bg-primary/10"
        >
          Back to Marketplace
        </a>
      </div>
    );
  }

  // Parse metadata from description if available
  let metadata = {
    type: "EEG Dataset",
    channels: 32,
    duration: "N/A",
    sampleRate: "256 Hz",
    fileSize: "N/A",
    format: "EDF+",
    subjects: 1,
    annotations: "—",
    institution: "Research Lab",
    description: dataset.title
  };

  try {
    const parsed = JSON.parse(dataset.description);
    metadata = { ...metadata, ...parsed };
  } catch {
    metadata.description = dataset.description;
  }

  const specs = [
    ["CHANNELS", `${metadata.channels}`],
    ["DURATION", metadata.duration],
    ["SAMPLE RATE", metadata.sampleRate],
    ["FORMAT", metadata.format],
    ["FILE SIZE", metadata.fileSize],
    ["SUBJECTS", `${metadata.subjects}`],
    ["ANNOTATIONS", metadata.annotations],
    ["CID", dataset.cid || "—"],
    ["ENCRYPTION", "Lit Protocol · DatilDev"],
    ["LISTED", new Date(dataset.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
    ["PURCHASES", `${dataset.purchase_count}`],
  ];

  const researcherShort = dataset.researcher_address.substring(0, 6) + "..." + dataset.researcher_address.substring(38);
  const initials = researcherShort.substring(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="flex flex-col gap-10 lg:flex-row">
        {/* Left 62% */}
        <div className="flex-1" style={{ flex: "0 0 62%" }}>
          <div className="overflow-hidden rounded-[4px] border border-border bg-card p-4">
            <EEGWaveform variant="detail" />
          </div>

          <h1 className="mt-6 font-heading text-2xl font-bold text-foreground">{dataset.title}</h1>

          <div className="mt-3 flex gap-2">
            <span className="rounded-[3px] border border-border px-2 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
              {metadata.type}
            </span>
            <span className="rounded-[3px] border px-2 py-0.5 font-mono text-[9px] uppercase text-badge-green" style={{ borderColor: "rgba(74,222,128,0.3)", backgroundColor: "rgba(74,222,128,0.06)" }}>
              🔐 Encrypted
            </span>
          </div>

          <p className="mt-3 font-mono text-[13px] leading-[1.7] text-muted-foreground">{metadata.description}</p>

          {/* Specs */}
          <p className="label-uppercase mt-8 text-[10px] text-primary" style={{ letterSpacing: "0.1em" }}>
            TECHNICAL SPECIFICATIONS
          </p>
          <div className="mt-4">
            {specs.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-border-subtle py-2.5">
                <span className="label-uppercase text-[10px] text-text-tertiary" style={{ letterSpacing: "0.06em" }}>{label}</span>
                <span className="font-mono text-[13px] text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* PDP Proof Badge */}
          {dataset.cid && (
            <div className="mt-8">
              <PDPProofBadge pieceCid={dataset.cid} showVerifyButton={true} />
            </div>
          )}

          {/* Researcher */}
          <p className="label-uppercase mt-8 text-[10px] text-primary" style={{ letterSpacing: "0.1em" }}>
            RESEARCHER
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-raised font-mono text-[11px] text-muted-foreground">
              {initials}
            </div>
            <div>
              <p className="font-heading text-sm font-semibold text-foreground">{researcherShort}</p>
              <p className="font-mono text-[11px] text-text-tertiary">{metadata.institution}</p>
            </div>
          </div>
        </div>

        {/* Right sticky */}
        <div className="lg:sticky lg:top-[72px] lg:self-start" style={{ flex: "0 0 36%" }}>
          <div className="rounded-[4px] border border-border bg-card p-6">
            <p className="label-uppercase text-[10px] text-text-tertiary">PRICE</p>
            <p className="mt-2 font-mono text-[32px] font-bold text-primary">{dataset.price} tFIL</p>
            <p className="mt-1 font-mono text-xs text-text-tertiary">≈ ${(parseFloat(dataset.price) * 0.51).toFixed(2)} USD</p>

            <div className="my-4 border-t border-border" />

            <p className="font-mono text-[11px] text-text-tertiary">{dataset.purchase_count} researchers purchased</p>

            <div className="mt-4 flex flex-col gap-2">
              <span className="inline-flex rounded-[3px] border px-2.5 py-1 font-mono text-[10px] text-badge-green" style={{ borderColor: "rgba(74,222,128,0.2)", backgroundColor: "rgba(74,222,128,0.06)" }}>
                🔐 Lit Protocol encrypted
              </span>
              <span className="inline-flex rounded-[3px] border px-2.5 py-1 font-mono text-[10px] text-badge-green" style={{ borderColor: "rgba(74,222,128,0.2)", backgroundColor: "rgba(74,222,128,0.06)" }}>
                ✓ Filecoin verified
              </span>
              <span className="inline-flex rounded-[3px] border px-2.5 py-1 font-mono text-[10px] text-primary" style={{ borderColor: "rgba(249,115,22,0.2)", backgroundColor: "rgba(249,115,22,0.06)" }}>
                📡 PhysioNet source
              </span>
            </div>

            {checkingAccess ? (
              <div className="mt-5 flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">Checking access...</span>
              </div>
            ) : hasAccessToDataset ? (
              <button
                onClick={() => setShowPurchase(true)}
                className="mt-5 w-full rounded-[3px] bg-badge-green py-3 font-heading text-[13px] font-semibold text-white transition-colors hover:opacity-90"
              >
                ✓ Owned · Download Dataset
              </button>
            ) : (
              <button
                onClick={() => isConnected ? setShowPurchase(true) : setShowConnectModal(true)}
                className="mt-5 w-full rounded-[3px] bg-primary py-3 font-heading text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-accent-dim"
              >
                {isConnected ? `Purchase · ${dataset.price} tFIL` : "Connect Wallet to Purchase"}
              </button>
            )}

            <p className="mt-3 text-center font-mono text-[10px] leading-[1.6] text-text-tertiary">
              Payment via Filecoin FVM. Only your wallet can decrypt after purchase.
            </p>
          </div>
        </div>
      </div>

      <PurchaseModal
        isOpen={showPurchase}
        onClose={() => setShowPurchase(false)}
        datasetId={dataset.id}
        datasetName={dataset.title}
        datasetCid={dataset.cid}
        price={dataset.price}
        hasAccess={hasAccessToDataset}
        onPurchaseSuccess={() => {
          setHasAccessToDataset(true);
          toast.success("Purchase successful! You can now download the dataset.");
        }}
      />
    </div>
  );
};

export default DatasetDetail;
