"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { ActivityDataSkeleton } from "@/components/ui/PageSkeletons";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import { getFoodScanAnalysisFromApi } from "@/lib/foodScanApi";
import FoodScanAnalysisView from "./FoodScanAnalysisView";

interface FoodScanDetailModalProps {
  readonly scanId: string | null;
  readonly onClose: () => void;
}

type AnalysisState = {
  readonly scanId: string | null;
  readonly data: FoodScanAnalysis | null;
};

export default function FoodScanDetailModal({ scanId, onClose }: FoodScanDetailModalProps) {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ scanId: null, data: null });
  const isLoading = Boolean(scanId && analysisState.scanId !== scanId);

  useEffect(() => {
    if (!scanId) {
      return;
    }

    let isMounted = true;

    getFoodScanAnalysisFromApi(scanId)
      .then((nextAnalysis) => {
        if (isMounted) setAnalysisState({ scanId, data: nextAnalysis });
      })
      .catch(() => {
        if (isMounted) setAnalysisState({ scanId, data: null });
      });

    return () => {
      isMounted = false;
    };
  }, [scanId]);

  return (
    <Modal isOpen={Boolean(scanId)} title="Detail Scan Makanan" onClose={onClose}>
      {scanId && isLoading && <ActivityDataSkeleton rows={4} />}
      {scanId && !isLoading && analysisState.data?.scan.id === scanId && (
        <div className="pb-6">
          <FoodScanAnalysisView scanId={analysisState.data.scan.id} imageSizes="(max-width: 768px) 100vw, 672px" analysisData={analysisState.data} />
        </div>
      )}
    </Modal>
  );
}
