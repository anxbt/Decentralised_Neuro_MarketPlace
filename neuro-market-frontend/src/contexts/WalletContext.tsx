import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAccount, useDisconnect, useAccountEffect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from "@/hooks/use-toast";

interface WalletError {
  message: string;
  code?: string;
  timestamp: number;
}

interface WalletContextType {
  isConnected: boolean;
  address: string;
  showConnectModal: boolean;
  error: WalletError | null;
  isConnecting: boolean;
  setShowConnectModal: (show: boolean) => void;
  connect: (wallet?: string) => void;
  disconnect: () => void;
  retry: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  address: "",
  showConnectModal: false,
  error: null,
  isConnecting: false,
  setShowConnectModal: () => {},
  connect: () => {},
  disconnect: () => {},
  retry: () => {},
  clearError: () => {},
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected, status } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [error, setError] = useState<WalletError | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number>(0);

  // Track connection status changes
  useEffect(() => {
    if (status === 'connecting') {
      setIsConnecting(true);
      setError(null);
    } else if (status === 'connected') {
      setIsConnecting(false);
      setError(null);
      // Show success toast
      toast({
        title: "Wallet Connected",
        description: `Connected to ${address?.slice(0, 6)}...${address?.slice(-4)}`,
        variant: "default",
      });
    } else if (status === 'disconnected' && isConnecting) {
      // Connection failed
      setIsConnecting(false);
      const newError: WalletError = {
        message: "Failed to connect wallet. Please try again.",
        code: "CONNECTION_FAILED",
        timestamp: Date.now(),
      };
      setError(newError);
      
      toast({
        title: "Connection Failed",
        description: newError.message,
        variant: "destructive",
      });
    }
  }, [status, isConnecting, address]);

  // Monitor account changes and disconnections
  useAccountEffect({
    onConnect(data) {
      console.log('Wallet connected:', data.address);
      setError(null);
      setIsConnecting(false);
    },
    onDisconnect() {
      console.log('Wallet disconnected');
      // Clear all wallet-related state
      setError(null);
      setIsConnecting(false);
      setShowConnectModal(false);
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
        variant: "default",
      });
    },
  });

  const connect = () => {
    try {
      setLastConnectionAttempt(Date.now());
      setIsConnecting(true);
      setError(null);
      
      if (openConnectModal) {
        openConnectModal();
      } else {
        throw new Error("Connect modal not available");
      }
      
      setShowConnectModal(false);
    } catch (err) {
      const newError: WalletError = {
        message: err instanceof Error ? err.message : "Failed to open wallet connection modal",
        code: "MODAL_ERROR",
        timestamp: Date.now(),
      };
      setError(newError);
      setIsConnecting(false);
      
      toast({
        title: "Connection Error",
        description: newError.message,
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    try {
      wagmiDisconnect();
      // Clear all wallet-related state
      setError(null);
      setIsConnecting(false);
      setShowConnectModal(false);
      setLastConnectionAttempt(0);
    } catch (err) {
      const newError: WalletError = {
        message: err instanceof Error ? err.message : "Failed to disconnect wallet",
        code: "DISCONNECT_ERROR",
        timestamp: Date.now(),
      };
      setError(newError);
      
      toast({
        title: "Disconnection Error",
        description: newError.message,
        variant: "destructive",
      });
    }
  };

  const retry = () => {
    // Prevent rapid retry attempts (minimum 2 seconds between attempts)
    const timeSinceLastAttempt = Date.now() - lastConnectionAttempt;
    if (timeSinceLastAttempt < 2000) {
      toast({
        title: "Please Wait",
        description: "Please wait a moment before retrying.",
        variant: "default",
      });
      return;
    }
    
    setError(null);
    connect();
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <WalletContext.Provider 
      value={{ 
        isConnected, 
        address: address || "", 
        showConnectModal, 
        error,
        isConnecting,
        setShowConnectModal, 
        connect, 
        disconnect,
        retry,
        clearError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
