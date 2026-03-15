import React, { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { purchaseDataset } from "@/lib/contract";
import { getSynapseManager } from "@/lib/synapseStorage";
import { decryptFile, decryptMessage } from "@/lib/lit";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * PurchaseModal Component
 * 
 * Handles the complete purchase and download flow for datasets.
 * 
 * Error Handling (Validates Requirement 5.5):
 * - Insufficient balance: Displays clear message with required amount
 * - Transaction rejection: User-friendly message when user cancels
 * - Contract reverts: Specific messages for each revert reason
 *   - Dataset doesn't exist
 *   - Incorrect payment amount
 *   - Already purchased
 *   - Payment transfer failed
 * - Network errors: Timeout and connection issues
 * - Gas estimation errors: Warns about potential transaction failure
 * - Download errors: Access denied, decryption, and storage fetch failures
 * 
 * All errors maintain application state and provide retry functionality.
 */

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  datasetName: string;
  datasetCid: string;
  price: string;
  hasAccess: boolean;
  onPurchaseSuccess?: () => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ 
  isOpen, 
  onClose, 
  datasetId,
  datasetName, 
  datasetCid,
  price,
  hasAccess,
  onPurchaseSuccess
}) => {
  const { address } = useWallet();
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fromBase64 = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const steps = hasAccess 
    ? ["Fetching encrypted file", "Verifying access", "Decrypting file", "Ready to download"]
    : ["Sending tFIL to contract", "Confirming on Filecoin FVM", "Recording purchase", "Ready to download"];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(-1);
      setError(null);
      setIsProcessing(false);
      setTxHash(null);
      setIsDownloading(false);
      
      // If user already has access, skip to download
      if (hasAccess) {
        setCurrentStep(steps.length - 1);
      }
    }
  }, [isOpen, hasAccess]);

  const handlePurchase = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setCurrentStep(0);

      // Step 1: Send transaction to smart contract
      console.log(`[Purchase] Purchasing dataset ${datasetId} for ${price} tFIL`);
      const result = await purchaseDataset(datasetId, price);
      setTxHash(result.hash);
      
      setCurrentStep(1);
      
      // Step 2: Wait for transaction confirmation
      console.log(`[Purchase] Waiting for transaction confirmation: ${result.hash}`);
      const receipt = await result.wait();
      
      if (!receipt) {
        throw new Error("Transaction failed - no receipt received");
      }

      console.log(`[Purchase] Transaction confirmed in block ${receipt.blockNumber}`);
      setCurrentStep(2);

      // Purchase recorded on-chain via DatasetPurchased event (no backend needed)
      setCurrentStep(3);
      
      // Call success callback
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }

      toast.success("Purchase successful! You can now download the dataset.");
    } catch (err: any) {
      console.error("[Purchase] Error:", err);
      
      // Parse and display user-friendly error messages based on error type
      let errorMessage = "Failed to purchase dataset";
      
      // Handle insufficient balance errors
      if (err.message?.toLowerCase().includes('insufficient funds') || 
          err.message?.toLowerCase().includes('insufficient balance') ||
          err.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = `Insufficient tFIL balance. You need ${price} tFIL to purchase this dataset. Please add funds to your wallet.`;
      }
      // Handle transaction rejection by user
      else if (err.message?.includes('Transaction rejected') || 
               err.message?.includes('user rejected') ||
               err.code === 'ACTION_REJECTED') {
        errorMessage = "Transaction was rejected. Please try again when you're ready to complete the purchase.";
      }
      // Handle contract revert: dataset doesn't exist
      else if (err.message?.includes('Dataset does not exist') || 
               err.message?.includes('Dataset not found')) {
        errorMessage = "This dataset no longer exists on the blockchain. It may have been removed.";
      }
      // Handle contract revert: incorrect payment amount
      else if (err.message?.includes('Incorrect payment amount') || 
               err.message?.includes('Payment amount does not match')) {
        errorMessage = `Payment amount mismatch. The dataset price is ${price} tFIL. Please refresh the page and try again.`;
      }
      // Handle contract revert: already purchased
      else if (err.message?.includes('Already purchased') || 
               err.message?.includes('already purchased this dataset')) {
        errorMessage = "You have already purchased this dataset. Refresh the page to download it.";
      }
      // Handle contract revert: payment transfer failed
      else if (err.message?.includes('Payment transfer failed')) {
        errorMessage = "Payment transfer to researcher failed. This may be a network issue. Please try again.";
      }
      // Handle network errors
      else if (err.message?.toLowerCase().includes('network') || 
               err.message?.toLowerCase().includes('timeout') ||
               err.code === 'NETWORK_ERROR' ||
               err.code === 'TIMEOUT') {
        errorMessage = "Network error occurred. Please check your connection and try again.";
      }
      // Handle gas estimation errors
      else if (err.message?.toLowerCase().includes('gas') || 
               err.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = "Transaction may fail. Please ensure you have enough tFIL for both the purchase and gas fees.";
      }
      // Use the error message from contract.ts if it's already user-friendly
      else if (err.message && !err.message.includes('unknown') && !err.message.includes('Unknown')) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setIsDownloading(true);
      setError(null);
      
      console.log(`[Download] Starting download for dataset ${datasetId}`);
      
      // Step 1: Fetch encrypted file from Synapse
      toast.info("Fetching encrypted file from Filecoin storage...");
      const synapseManager = getSynapseManager();
      await synapseManager.initialize();
      
      const encryptedData = await synapseManager.downloadFile(datasetCid);
      console.log(`[Download] Downloaded ${encryptedData.length} bytes from Filecoin`);
      
      // Step 2: Decrypt file using Lit Protocol
      toast.info("Decrypting file with Lit Protocol...");

      const decoder = new TextDecoder();
      const envelopeStr = decoder.decode(encryptedData);

      // Get ethers signer from browser wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      let decryptedFile: File;

      let envelope: any;
      try {
        envelope = JSON.parse(envelopeStr);
      } catch {
        throw new Error('Downloaded payload is not a valid encrypted envelope.');
      }

      console.log('[Download] Envelope version:', envelope?.version || 'LEGACY (no version)');
      console.log('[Download] Envelope keys:', Object.keys(envelope));

      if (envelope?.version === "v2") {
        console.log('[Download] Using v2 decryption (AES-GCM + Lit key)');
        const keyBase64 = await decryptMessage(
          envelope.litCiphertext,
          envelope.litDataToEncryptHash,
          datasetId,
          signer
        );

        const keyBytes = fromBase64(keyBase64);
        const ivBytes = fromBase64(envelope.iv);
        const encryptedBytes = fromBase64(envelope.encryptedFile);

        const aesKey = await crypto.subtle.importKey(
          "raw",
          keyBytes,
          { name: "AES-GCM" },
          false,
          ["decrypt"]
        );

        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivBytes },
          aesKey,
          encryptedBytes
        );

        const fileName = envelope.fileName || `${datasetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.edf`;
        const fileType = envelope.fileType || "application/octet-stream";
        decryptedFile = new File([decryptedBuffer], fileName, { type: fileType });
      } else if (envelope?.ciphertext && envelope?.dataToEncryptHash) {
        console.warn('[Download] WARNING: Legacy envelope detected. This dataset was uploaded before the v2 encryption fix.');
        console.warn('[Download] Legacy ciphertext length:', envelope.ciphertext.length, 'chars — this WILL fail if > ~1MB');
        throw new Error('This dataset was uploaded with an older encryption format that is no longer supported. Please ask the researcher to re-upload it.');
      } else {
        throw new Error('Unsupported encrypted envelope format');
      }
      
      console.log(`[Download] Decryption successful`);
      
      // Step 3: Trigger browser download
      const blob = new Blob([decryptedFile], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${datasetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.edf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Dataset downloaded successfully!");
      onClose();
    } catch (err: any) {
      console.error("[Download] Error:", err);
      
      // Parse and display user-friendly error messages
      let errorMessage = "Failed to download dataset";
      
      // Handle access denied errors
      if (err.message?.toLowerCase().includes('access denied') || 
          err.message?.toLowerCase().includes('not authorized') ||
          err.message?.toLowerCase().includes('no access')) {
        errorMessage = "Access denied. You don't own this dataset. Please purchase it first.";
      }
      // Handle Lit Protocol decryption errors
      else if (err.message?.toLowerCase().includes('decrypt') || 
               err.message?.toLowerCase().includes('lit protocol')) {
        errorMessage = "Decryption failed. Please ensure you have access to this dataset and try again.";
      }
      // Handle Synapse/Filecoin storage errors
      else if (err.message?.toLowerCase().includes('synapse') || 
               err.message?.toLowerCase().includes('filecoin') ||
               err.message?.toLowerCase().includes('storage')) {
        errorMessage = "Failed to fetch file from Filecoin storage. The file may be temporarily unavailable. Please try again.";
      }
      // Handle CID not found errors
      else if (err.message?.toLowerCase().includes('not found') || 
               err.message?.toLowerCase().includes('cid')) {
        errorMessage = "Dataset file not found in storage. Please contact the researcher.";
      }
      // Handle network errors
      else if (err.message?.toLowerCase().includes('network') || 
               err.message?.toLowerCase().includes('timeout')) {
        errorMessage = "Network error occurred. Please check your connection and try again.";
      }
      // Use the error message if it's already user-friendly
      else if (err.message && !err.message.includes('unknown') && !err.message.includes('Unknown')) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  // Auto-start purchase when modal opens (if not already owned)
  useEffect(() => {
    if (isOpen && !hasAccess && currentStep === -1 && !isProcessing && !error) {
      handlePurchase();
    }
  }, [isOpen, hasAccess, currentStep, isProcessing, error]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={!isProcessing && !isDownloading ? onClose : undefined}
    >
      <div
        className="modal-shadow w-full max-w-[420px] rounded-[4px] border border-border bg-card p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-base font-semibold text-foreground">{datasetName}</h3>
        <p className="mt-2 font-mono text-xl font-bold text-primary">{price} tFIL</p>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2 text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Steps */}
        {!error && (
          <div className="mt-6 flex flex-col gap-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border">
                  {i < currentStep ? (
                    <Check size={10} className="text-primary" fill="currentColor" />
                  ) : i === currentStep && i < steps.length - 1 ? (
                    <Loader2 size={10} className="animate-spin-slow text-primary" />
                  ) : i === currentStep && i === steps.length - 1 ? (
                    <Check size={10} className="text-primary" fill="currentColor" />
                  ) : null}
                </div>
                <span className={`font-mono text-[13px] ${i <= currentStep ? (i < currentStep ? "text-text-tertiary" : "text-foreground") : "text-text-tertiary"}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Transaction Hash */}
        {txHash && (
          <div className="mt-4 rounded-[3px] border border-border bg-background p-3">
            <p className="font-mono text-[10px] text-text-tertiary">TRANSACTION</p>
            <a
              href={`https://calibration.filfox.info/en/message/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block font-mono text-[11px] text-primary hover:underline"
            >
              {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
            </a>
          </div>
        )}

        {/* Download Button */}
        {currentStep === steps.length - 1 && !error && (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-[3px] bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download size={14} fill="currentColor" />
                Download EEG File
              </>
            )}
          </button>
        )}

        {/* Retry Button */}
        {error && (
          <div className="mt-4 flex gap-2">
            <Button
              onClick={hasAccess ? handleDownload : handlePurchase}
              disabled={isProcessing || isDownloading}
              variant="default"
              className="flex-1"
            >
              {isProcessing || isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Retry"
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        )}

        {/* Close Button (only when not processing) */}
        {!isProcessing && !isDownloading && !error && currentStep !== steps.length - 1 && (
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-[3px] border border-border px-4 py-2 font-mono text-xs text-muted-foreground hover:border-primary/40"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default PurchaseModal;
