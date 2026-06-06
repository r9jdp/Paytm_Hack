import { Camera, Play, Square, TestTube2 } from "lucide-react";

import styles from "../styles.module.css";

type ScanControlsProps = {
  isScanning: boolean;
  isAnalyzing: boolean;
  hasCatalog: boolean;
  onStart: () => void;
  onStop: () => void;
  onAnalyze: () => void;
  onUseDemo: () => void;
  onConfirmAll: () => void;
};

export function ScanControls({
  isScanning,
  isAnalyzing,
  hasCatalog,
  onStart,
  onStop,
  onAnalyze,
  onUseDemo,
  onConfirmAll
}: ScanControlsProps) {
  return (
    <div className={styles.scanControls}>
      <button className={styles.primaryAction} disabled={isScanning} onClick={onStart} type="button">
        <Play aria-hidden="true" size={17} />
        Start scan
      </button>
      <button className={styles.secondaryAction} disabled={!isScanning} onClick={onStop} type="button">
        <Square aria-hidden="true" size={17} />
        Stop
      </button>
      <button className={styles.secondaryAction} disabled={isAnalyzing} onClick={onAnalyze} type="button">
        <Camera aria-hidden="true" size={17} />
        {isAnalyzing ? "Analyzing..." : "Analyze frame"}
      </button>
      <button className={styles.secondaryAction} onClick={onUseDemo} type="button">
        <TestTube2 aria-hidden="true" size={17} />
        Use demo shelf data
      </button>
      <button className={styles.confirmAction} disabled={!hasCatalog} onClick={onConfirmAll} type="button">
        Confirm catalog
      </button>
    </div>
  );
}
