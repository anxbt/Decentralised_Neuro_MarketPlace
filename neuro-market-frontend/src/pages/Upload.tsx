import React, { useState, useEffect } from "react";
import { Upload, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";
import { encryptFile } from "@/lib/lit";
import { getSynapseManager } from "@/lib/synapseStorage";
import { registerDataset } from "@/lib/contract";
import { createDataset } from "@/lib/api";
import { toast } from "sonner";

const datasetTypes = ["Sleep EEG", "Motor Imagery", "Cognitive", "P300", "SSVEP", "Clinical", "Multimodal", "Other"];

const uploadSteps = [
  "Encrypting with Lit Protocol",
  "Uploading to Filecoin Storage",
  "Registering on Filecoin FVM",
  "Dataset listed",
];

const UploadPage: React.FC = () => {
  const { isConnected, address, setShowConnectModal } = useWallet();
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    channelCount: "",
    duration: "",
    sampleRate: "",
    fileSize: "",
    researcherName: "",
    institution: "",
    price: ""
  });

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);

    // Auto-fill file size
    const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
    setFormData(prev => ({ ...prev, fileSize: sizeMB }));
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "",
      channelCount: "",
      duration: "",
      sampleRate: "",
      fileSize: "",
      researcherName: "",
      institution: "",
      price: ""
    });
    setFile(null);
    setFileName("");
    setCid("");
    setComplete(false);
    setSubmitting(false);
    setCurrentStep(-1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check wallet connection
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      setShowConnectModal(true);
      return;
    }

    // Validate required fields
    if (!formData.title.trim()) {
      toast.error("Dataset name is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    // Check file size (max 200 MiB for Synapse)
    const maxSize = 200 * 1024 * 1024; // 200 MiB in bytes
    if (file.size > maxSize) {
      toast.error("File size must be less than 200 MiB");
      return;
    }

    setSubmitting(true);
    setCurrentStep(0);
    setError(null);

    try {
      // Generate unique dataset ID
      const datasetId = `dataset-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log("[Upload] Starting upload pipeline for dataset:", datasetId);

      // Step 1: Encrypt file with Lit Protocol
      console.log("[Upload] Step 1: Encrypting file with Lit Protocol...");
      const { ciphertext, dataToEncryptHash } = await encryptFile(file, datasetId);
      console.log("[Upload] Encryption complete. Hash:", dataToEncryptHash);
      setCurrentStep(1);

      // Step 2: Upload encrypted file to Filecoin storage via Synapse SDK
      console.log("[Upload] Step 2: Uploading to Filecoin storage...");
      const synapseManager = getSynapseManager();

      // Initialize Synapse if not already done
      await synapseManager.initialize();

      // Check if setup is complete (USDFC deposited and Pandora approved)
      // If not, automatically trigger only the missing transactions
      try {
        const setupComplete = await synapseManager.isSetupComplete();
        if (!setupComplete) {
          console.log("[Upload] Storage setup incomplete — running auto-setup...");
          toast.info("Setting up Filecoin storage — please confirm the wallet transactions");

          // Check what's missing
          const balances = await synapseManager.getBalances();
          const hasDeposit = parseFloat(balances.deposited) > 0;
          const hasApproval = balances.allowance !== '0';

          if (!hasDeposit) {
            // Step A: Deposit 10 USDFC into Payments contract
            console.log("[Upload] Depositing 10 USDFC...");
            toast.info("Depositing 10 USDFC — please confirm in MetaMask");
            await synapseManager.depositUSDFC("10");
            console.log("[Upload] USDFC deposit confirmed!");
          } else {
            console.log("[Upload] USDFC already deposited, skipping deposit");
          }

          if (!hasApproval) {
            // Step B: Approve Pandora service as operator
            console.log("[Upload] Approving Pandora service...");
            toast.info("Approving storage service — please confirm in MetaMask");
            await synapseManager.approvePandoraService();
            console.log("[Upload] Pandora service approved!");
          } else {
            console.log("[Upload] Pandora already approved, skipping approval");
          }

          toast.success("Storage setup complete!");
        }
      } catch (setupErr) {
        console.warn("[Upload] Setup check/auto-setup failed, proceeding with upload anyway:", setupErr);
        // Don't block upload — the SDK may handle setup internally
      }

      // Convert ciphertext string to Uint8Array for upload
      const encoder = new TextEncoder();
      const encryptedData = encoder.encode(ciphertext);

      const uploadResult = await synapseManager.uploadFile(encryptedData);
      const pieceCid = uploadResult.pieceCid;
      console.log("[Upload] Uploaded to Filecoin. PieceCID:", pieceCid);
      setCid(pieceCid);
      setCurrentStep(2);

      // Step 3: Register on smart contract
      console.log("[Upload] Step 3: Registering on Filecoin FVM...");
      const txResult = await registerDataset(datasetId, pieceCid, formData.price);
      console.log("[Upload] Transaction submitted. Hash:", txResult.hash);

      // Wait for transaction confirmation
      await txResult.wait();
      console.log("[Upload] Transaction confirmed!");
      setCurrentStep(3);

      // Step 4: Store metadata in backend
      console.log("[Upload] Step 4: Storing metadata in backend...");
      await createDataset({
        id: datasetId,
        title: formData.title,
        description: formData.description || "No description provided",
        price: formData.price,
        cid: pieceCid, // Store PieceCID
        researcher_address: address,
        tx_hash: txResult.hash
      });
      console.log("[Upload] Metadata stored in backend");

      // Complete!
      setComplete(true);
      toast.success("Dataset listed successfully!");
      console.log("[Upload] Upload pipeline complete!");

    } catch (err) {
      console.error("[Upload] Upload failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      toast.error(errorMessage);
      setSubmitting(false);
      setCurrentStep(-1);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] px-6 py-10">
      <h1 className="font-heading text-[22px] font-bold text-foreground">List a Dataset</h1>
      <p className="mt-2 font-mono text-[13px] text-muted-foreground">
        Your file will be encrypted before upload. Only buyers can decrypt.
      </p>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-[620px] rounded-[4px] border border-border bg-card p-8">
        {/* Wallet Connection Check */}
        {!isConnected && (
          <div className="mb-6 rounded-[4px] border border-primary/20 bg-primary/5 p-4">
            <p className="font-mono text-xs text-primary">Please connect your wallet to upload datasets</p>
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="mt-2 rounded-[3px] border border-primary px-4 py-2 font-mono text-xs text-primary hover:bg-primary/10"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-[4px] border border-red-500/20 bg-red-500/10 p-4">
            <p className="font-mono text-xs text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => { setError(null); setSubmitting(false); setCurrentStep(-1); }}
              className="mt-2 rounded-[3px] border border-red-500 px-4 py-2 font-mono text-xs text-red-500 hover:bg-red-500/10"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Dataset Info */}
        <p className="label-uppercase text-[10px] text-primary" style={{ letterSpacing: "0.1em" }}>
          DATASET INFO
        </p>
        <input
          placeholder="Dataset Name"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="mt-3 w-full rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          required
          disabled={submitting}
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
          className="mt-3 w-full rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          disabled={submitting}
        />
        <select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          className="mt-3 w-full rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground focus:border-primary focus:outline-none"
          disabled={submitting}
        >
          <option value="">Select Type</option>
          {datasetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Technical Specs */}
        <p className="label-uppercase mt-7 text-[10px] text-primary" style={{ letterSpacing: "0.1em" }}>
          TECHNICAL SPECS
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input
            placeholder="Channel Count"
            value={formData.channelCount}
            onChange={(e) => setFormData(prev => ({ ...prev, channelCount: e.target.value }))}
            className="rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            disabled={submitting}
          />
          <input
            placeholder="Duration"
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
            className="rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            disabled={submitting}
          />
          <input
            placeholder="Sample Rate (Hz)"
            value={formData.sampleRate}
            onChange={(e) => setFormData(prev => ({ ...prev, sampleRate: e.target.value }))}
            className="rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            disabled={submitting}
          />
          <input
            placeholder="File Size (MB)"
            value={formData.fileSize}
            onChange={(e) => setFormData(prev => ({ ...prev, fileSize: e.target.value }))}
            className="rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            disabled={submitting}
            readOnly
          />
          <input
            placeholder="Researcher Name"
            value={formData.researcherName}
            onChange={(e) => setFormData(prev => ({ ...prev, researcherName: e.target.value }))}
            className="rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            disabled={submitting}
          />
          <input
            placeholder="Institution"
            value={formData.institution}
            onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
            className="rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
            disabled={submitting}
          />
        </div>

        {/* Pricing */}
        <p className="label-uppercase mt-7 text-[10px] text-primary" style={{ letterSpacing: "0.1em" }}>
          PRICING
        </p>
        <input
          placeholder="Price in tFIL"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
          className="mt-3 w-full rounded-[3px] border border-border bg-background px-3.5 py-2.5 font-mono text-[13px] text-foreground placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          required
          disabled={submitting}
        />
        <p className="mt-1 font-mono text-[11px] text-text-tertiary">≈ $0.00 USD</p>

        {/* File Upload */}
        <p className="label-uppercase mt-7 text-[10px] text-primary" style={{ letterSpacing: "0.1em" }}>
          FILE UPLOAD
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); if (!submitting) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!submitting && e.dataTransfer.files[0]) {
              handleFileSelect(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => !submitting && document.getElementById("file-input")?.click()}
          className={`mt-3 cursor-pointer rounded-[4px] border border-dashed px-5 py-10 text-center transition-colors ${submitting ? "cursor-not-allowed opacity-50" : ""
            } ${dragOver ? "border-primary bg-primary/[0.04]" : "border-border bg-background"
            }`}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".edf,.bdf,.csv,.mat,.eeg"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            disabled={submitting}
          />
          <Upload size={24} className="mx-auto text-text-tertiary" fill="currentColor" />
          <p className="mt-3 font-heading text-sm font-semibold text-foreground">
            {fileName || "Drop EEG file here"}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">or click to browse</p>
          <p className="mt-2 font-mono text-[10px] text-text-tertiary">.edf · .bdf · .csv · .mat · .eeg</p>
          <p className="font-mono text-[10px] text-text-tertiary">Max 200 MiB</p>
        </div>

        {/* Info Box */}
        <div className="mt-6 rounded-r-[3px] border-l-[3px] border-l-primary py-3.5 pl-4 pr-4" style={{ backgroundColor: "rgba(249,115,22,0.04)" }}>
          <p className="label-uppercase text-[10px] text-primary">ENCRYPTION & STORAGE PIPELINE</p>
          <p className="mt-2 font-mono text-[11px] leading-[1.7] text-muted-foreground">
            File → Lit Protocol (NagaDev) → encrypted blob → Filecoin Storage (Synapse SDK)<br />
            On-chain access via Filecoin FVM. Storage proven by PDP. You retain full ownership.
          </p>
        </div>

        {!submitting ? (
          <button
            type="submit"
            disabled={!isConnected}
            className="mt-6 w-full rounded-[3px] bg-primary py-3.5 font-heading text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnected ? "Encrypt & List Dataset" : "Connect Wallet First"}
          </button>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {uploadSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border" style={i < currentStep ? { backgroundColor: "hsl(25 95% 53%)" } : {}}>
                  {i < currentStep ? (
                    <Check size={10} className="text-primary-foreground" />
                  ) : i === currentStep && !complete ? (
                    <Loader2 size={10} className="animate-spin-slow text-primary" />
                  ) : i === currentStep && complete ? (
                    <Check size={10} className="text-primary-foreground" />
                  ) : null}
                </div>
                <span className={`font-mono text-[13px] ${i <= currentStep ? (i < currentStep ? "text-text-tertiary" : "text-foreground") : "text-text-tertiary"}`}>
                  {step}
                </span>
              </div>
            ))}

            {complete && cid && (
              <div className="mt-4">
                <p className="font-mono text-[11px] text-primary">CID: {cid.substring(0, 20)}...</p>
                <p className="mt-2 font-mono text-[11px] text-badge-green">✓ Dataset successfully listed!</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/marketplace"
                    className="inline-block rounded-[3px] border border-primary px-4 py-2 font-mono text-[13px] text-primary transition-colors hover:bg-primary/10"
                  >
                    View in Marketplace →
                  </Link>
                  <Link
                    to="/dashboard"
                    className="inline-block rounded-[3px] bg-primary px-4 py-2 font-mono text-[13px] text-primary-foreground transition-colors hover:bg-accent-dim"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-[3px] border border-border px-4 py-2 font-mono text-[13px] text-foreground transition-colors hover:bg-muted"
                  >
                    List Another Dataset
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadPage;
