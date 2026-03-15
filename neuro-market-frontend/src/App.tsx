import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { initializeLitClient } from "@/lib/lit";
import Navbar from "@/components/Navbar";
import ConnectWalletModal from "@/components/ConnectWalletModal";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import DatasetDetail from "./pages/DatasetDetail";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import Verify from "./pages/Verify";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Initialize Lit Protocol client with contract address
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
if (CONTRACT_ADDRESS) {
  initializeLitClient(CONTRACT_ADDRESS, 'filecoinCalibrationTestnet');
} else {
  console.warn('VITE_CONTRACT_ADDRESS not set. Lit Protocol encryption will not work.');
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WalletProvider>
          <Navbar />
          <ConnectWalletModal />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/dataset/:id" element={<DatasetDetail />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/verify/:pieceCid" element={<Verify />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WalletProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
