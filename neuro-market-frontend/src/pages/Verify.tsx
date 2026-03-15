/**
 * Verify Page — Dataset Integrity Verification
 *
 * Allows anyone to verify that a dataset stored on Filecoin matches the
 * content hash recorded on-chain. This is the "trust but verify" page.
 *
 * Flow:
 *   1. User enters PieceCID or dataset ID
 *   2. Page fetches on-chain contentHash from the smart contract
 *   3. User can upload the original file to recompute SHA-256 locally
 *   4. Page compares hashes and shows match/mismatch
 */

import React, { useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Upload,
  Search,
  ExternalLink,
  FileCheck,
  Loader2,
  Copy,
  CheckCircle,
} from "lucide-react";
import { getDataset, CONTRACT_ADDRESS } from "@/lib/contract";
import { fetchDataset } from "@/lib/api";

const VerifyPage: React.FC = () => {
  const { pieceCid: paramCid } = useParams<{ pieceCid: string }>();
  const [searchParams] = useSearchParams();
  const paramDatasetId = searchParams.get("datasetId");

  const [datasetId, setDatasetId] = useState(paramDatasetId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On-chain data
  const [onChainHash, setOnChainHash] = useState<string | null>(null);
  const [onChainCid, setOnChainCid] = useState<string | null>(null);
  const [onChainResearcher, setOnChainResearcher] = useState<string | null>(null);
  const [onChainPrice, setOnChainPrice] = useState<string | null>(null);

  // File verification
  const [localHash, setLocalHash] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<"match" | "mismatch" | null>(null);

  const [copied, setCopied] = useState(false);

  // Look up on-chain data for a dataset ID
  const lookupDataset = useCallback(async () => {
    if (!datasetId.trim()) return;

    setLoading(true);
    setError(null);
    setOnChainHash(null);
    setOnChainCid(null);
    setLocalHash(null);
    setVerificationResult(null);

    try {
      const dataset = await getDataset(datasetId.trim());
      setOnChainHash(dataset.contentHash);
      setOnChainCid(dataset.cid);
      setOnChainResearcher(dataset.researcher);

      const { ethers } = await import("ethers");
      setOnChainPrice(ethers.formatEther(dataset.price) + " tFIL");
    } catch (err: any) {
      setError(err.message || "Dataset not found on-chain");
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  // Try to resolve PieceCID → dataset ID via backend
  const lookupByCid = useCallback(async () => {
    if (!paramCid) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch all datasets and find one matching this CID
      const { fetchDatasets } = await import("@/lib/api");
      const datasets = await fetchDatasets();
      const match = datasets.find((d: any) => d.cid === paramCid);

      if (match) {
        setDatasetId(match.id);
        // Now look up on-chain
        const dataset = await getDataset(match.id);
        setOnChainHash(dataset.contentHash);
        setOnChainCid(dataset.cid);
        setOnChainResearcher(dataset.researcher);

        const { ethers } = await import("ethers");
        setOnChainPrice(ethers.formatEther(dataset.price) + " tFIL");
      } else {
        setError(`No dataset found with PieceCID: ${paramCid}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to look up dataset");
    } finally {
      setLoading(false);
    }
  }, [paramCid]);

  // Auto-lookup if URL has pieceCid
  React.useEffect(() => {
    if (paramCid) lookupByCid();
    else if (paramDatasetId) lookupDataset();
  }, [paramCid, paramDatasetId]);

  // Compute SHA-256 of uploaded file
  const handleFileVerify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerifying(true);
    setVerificationResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hash =
        "0x" +
        Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

      setLocalHash(hash);

      if (onChainHash) {
        setVerificationResult(
          hash.toLowerCase() === onChainHash.toLowerCase() ? "match" : "mismatch"
        );
      }
    } catch {
      setError("Failed to compute file hash");
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isZeroHash = onChainHash === "0x" + "0".repeat(64);

  return (
    <div className="min-h-screen bg-background px-4 pb-20 pt-24">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
            <Shield size={28} className="text-green-500" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Verify Dataset Integrity
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cryptographically verify that a dataset matches the content hash
            recorded on-chain at deployment time.
          </p>
        </div>

        {/* Search box (only show if no URL param) */}
        {!paramCid && (
          <div className="mb-8 rounded-[4px] border border-border bg-card p-6">
            <label className="mb-2 block text-sm font-medium text-foreground">
              Dataset ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupDataset()}
                placeholder="dataset-1773069746086-o260y"
                className="flex-1 rounded-[3px] border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                onClick={lookupDataset}
                disabled={loading || !datasetId.trim()}
                className="inline-flex items-center gap-2 rounded-[3px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Look Up
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-[4px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* On-chain data */}
        {onChainHash && (
          <div className="space-y-6">
            {/* On-chain record card */}
            <div className="rounded-[4px] border border-green-500/20 bg-green-500/5 p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileCheck size={18} className="text-green-500" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  On-Chain Record
                </h2>
              </div>

              <div className="space-y-3">
                <InfoRow label="Dataset ID" value={datasetId} mono />
                {onChainCid && <InfoRow label="PieceCID" value={onChainCid} mono truncate />}
                {onChainResearcher && (
                  <InfoRow label="Researcher" value={onChainResearcher} mono />
                )}
                {onChainPrice && <InfoRow label="Price" value={onChainPrice} />}

                <div className="rounded-[3px] border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                      Content Hash (SHA-256, on-chain)
                    </p>
                    <button
                      onClick={() => copyToClipboard(onChainHash)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-green-500">
                    {onChainHash}
                  </p>
                </div>

                {/* Link to block explorer */}
                <a
                  href={`https://calibration.filfox.info/en/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  <ExternalLink size={12} />
                  View contract on Filfox
                </a>
              </div>
            </div>

            {/* File verification card */}
            <div className="rounded-[4px] border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Upload size={18} className="text-foreground" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Verify File
                </h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Upload the original (plaintext, pre-encryption) file to compute
                its SHA-256 hash locally. Nothing leaves your browser.
              </p>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[3px] border-2 border-dashed border-border px-6 py-8 transition-colors hover:border-primary/50 hover:bg-primary/5">
                <input
                  type="file"
                  onChange={handleFileVerify}
                  className="hidden"
                />
                {verifying ? (
                  <>
                    <Loader2 size={24} className="mb-2 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Computing hash...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Drop file here or click to select
                    </span>
                  </>
                )}
              </label>

              {/* Local hash result */}
              {localHash && (
                <div className="mt-4 rounded-[3px] border border-border bg-background p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                    Computed Hash (local)
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {localHash}
                  </p>
                </div>
              )}

              {/* Verification result */}
              {verificationResult === "match" && (
                <div className="mt-4 flex items-center gap-3 rounded-[4px] border border-green-500/30 bg-green-500/10 p-4">
                  <ShieldCheck size={24} className="text-green-500" />
                  <div>
                    <p className="font-heading text-sm font-bold text-green-500">
                      Integrity Verified
                    </p>
                    <p className="text-xs text-green-400">
                      The file hash matches the on-chain content hash exactly.
                      This dataset has not been tampered with.
                    </p>
                  </div>
                </div>
              )}

              {verificationResult === "mismatch" && (
                <div className="mt-4 flex items-center gap-3 rounded-[4px] border border-red-500/30 bg-red-500/10 p-4">
                  <ShieldX size={24} className="text-red-500" />
                  <div>
                    <p className="font-heading text-sm font-bold text-red-500">
                      Hash Mismatch
                    </p>
                    <p className="text-xs text-red-400">
                      The file hash does NOT match the on-chain record. The file
                      may have been modified or this is not the original file.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* PDP badge / Filecoin storage proof link */}
            {onChainCid && (
              <div className="rounded-[4px] border border-border bg-card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Shield size={18} className="text-green-500" />
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Filecoin Storage Proof
                  </h2>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">
                  Independent of the content hash, Filecoin storage providers
                  submit cryptographic Proof of Data Possession (PDP) to the
                  network, proving the encrypted file is continuously stored.
                </p>
                <a
                  href={`https://beryx.io/?search=${onChainCid}&network=calibration`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[3px] border border-green-500 px-3 py-2 font-mono text-xs text-green-500 transition-colors hover:bg-green-500/10"
                >
                  <ExternalLink size={14} />
                  Verify PDP Proof on Beryx
                </a>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!onChainHash && !loading && !error && !paramCid && (
          <div className="text-center text-muted-foreground">
            <Shield size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">
              Enter a dataset ID above to look up its on-chain content hash.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for info rows
const InfoRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}> = ({ label, value, mono, truncate }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
    <span className="min-w-[100px] text-xs text-muted-foreground">{label}</span>
    <span
      className={`text-sm text-foreground ${mono ? "font-mono" : ""} ${
        truncate ? "truncate" : "break-all"
      }`}
    >
      {value}
    </span>
  </div>
);

export default VerifyPage;
