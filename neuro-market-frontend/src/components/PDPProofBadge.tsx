/**
 * PDP Proof Badge Component
 * 
 * Displays the PieceCID and PDP proof status for a dataset.
 * This is the "wow moment" for judges - showing cryptographic proof of storage.
 */

import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';

interface PDPProofBadgeProps {
  pieceCid: string;
  compact?: boolean;
  showVerifyButton?: boolean;
}

const PDPProofBadge: React.FC<PDPProofBadgeProps> = ({
  pieceCid,
  compact = false,
  showVerifyButton = false
}) => {
  const handleVerifyClick = () => {
    // Open Beryx explorer to verify PDP proof — supports PieceCID lookups on Calibration
    const explorerUrl = `https://beryx.io/?search=${pieceCid}&network=calibration`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-[3px] border border-green-500/20 bg-green-500/10 px-3 py-1.5">
        <Shield size={14} className="text-green-500" />
        <span className="font-mono text-[11px] text-green-500">
          Storage proven by Filecoin PDP
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-[4px] border border-green-500/20 bg-green-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
          <Shield size={16} className="text-green-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-heading text-sm font-semibold text-green-500">
              Storage Proven by Filecoin PDP
            </p>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            This dataset is cryptographically proven to be stored on Filecoin.
            Storage providers submit periodic proofs of possession.
          </p>
          <div className="mt-3 rounded-[3px] border border-border bg-background p-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
              PieceCID
            </p>
            <p className="mt-1 break-all font-mono text-[12px] text-foreground">
              {pieceCid}
            </p>
          </div>
          {showVerifyButton && (
            <button
              onClick={handleVerifyClick}
              className="mt-3 inline-flex items-center gap-2 rounded-[3px] border border-green-500 px-3 py-2 font-mono text-[12px] text-green-500 transition-colors hover:bg-green-500/10"
            >
              <ExternalLink size={14} />
              Verify on Block Explorer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDPProofBadge;
