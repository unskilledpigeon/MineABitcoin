import { memo } from "react";

export const SbtcIcon = memo(function SbtcIcon({ size = 16 }: { size?: number }) {
  return <img src="/sbtc.png" alt="sBTC" width={size} height={size} className="token-icon-inline" />;
});
