import React from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

const ConnectWalletModal: React.FC = () => {
  const { showConnectModal, setShowConnectModal, connect, error, isConnecting, retry, clearError } = useWallet();

  if (!showConnectModal) return null;

  const wallets = ["MetaMask", "WalletConnect", "Coinbase Wallet"];

  const handleConnect = () => {
    clearError();
    connect();
  };

  const handleRetry = () => {
    retry();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={() => setShowConnectModal(false)}
    >
      <div
        className="modal-shadow w-full max-w-[380px] rounded-[4px] border border-border bg-card p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-heading text-lg font-bold text-foreground">Connect Wallet</h3>
        <p className="mt-1.5 font-mono text-[11px] text-text-tertiary">
          Filecoin Calibration · Chain ID 314159
        </p>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Options */}
        <div className="mt-5 flex flex-col gap-2.5">
          {wallets.map((w) => (
            <button
              key={w}
              onClick={handleConnect}
              disabled={isConnecting}
              className="rounded-[3px] border border-border bg-background px-4 py-3.5 text-left font-heading text-sm font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? "Connecting..." : w}
            </button>
          ))}
        </div>

        {/* Retry Button */}
        {error && (
          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleRetry}
              disabled={isConnecting}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isConnecting ? 'animate-spin' : ''}`} />
              {isConnecting ? "Connecting..." : "Retry Connection"}
            </Button>
          </div>
        )}

        {/* Help Text */}
        <p className="mt-4 text-center font-mono text-[10px] text-text-tertiary">
          Make sure your wallet is installed and unlocked
        </p>
      </div>
    </div>
  );
};

export default ConnectWalletModal;
