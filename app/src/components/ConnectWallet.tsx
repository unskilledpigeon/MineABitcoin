import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { connect, DEFAULT_PROVIDERS } from "@stacks/connect";

interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installed: boolean;
  webUrl?: string;
}

interface Props {
  address: string | null;
  onConnect: (address: string) => void;
  onDisconnect: () => void;
}

function isProviderInstalled(id: string): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;

  switch (id) {
    case "LeatherProvider":
      return !!(
        w.LeatherProvider ||
        (w.StacksProvider &&
          (w.StacksProvider as Record<string, unknown>).isLeather)
      );
    case "XverseProviders.BitcoinProvider":
      return !!(
        w.XverseProviders &&
        (w.XverseProviders as Record<string, unknown>).BitcoinProvider
      );
    case "AsignaProvider":
      return !!w.AsignaProvider;
    case "FordefiProviders.UtxoProvider":
      return !!(
        w.FordefiProviders &&
        (w.FordefiProviders as Record<string, unknown>).UtxoProvider
      );
    default:
      return !!w[id];
  }
}

function WalletModal({
  onSelect,
  onClose,
}: {
  onSelect: (wallet: WalletInfo) => void;
  onClose: () => void;
}) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const detectWallets = useCallback(() => {
    const list: WalletInfo[] = DEFAULT_PROVIDERS
      .filter((p) => p.icon)
      .map((p) => ({
        id: p.id,
        name: p.name,
        icon: p.icon!,
        installed: isProviderInstalled(p.id),
        webUrl: p.webUrl,
      }));

    list.sort((a, b) =>
      a.installed === b.installed ? 0 : a.installed ? -1 : 1
    );
    setWallets(list);
  }, []);

  useEffect(() => {
    // Brief delay so extensions have time to inject providers
    const timer = setTimeout(detectWallets, 50);
    return () => clearTimeout(timer);
  }, [detectWallets]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div
        className="wallet-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Connect wallet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wallet-modal-header">
          <h2>Connect Wallet</h2>
          <button
            className="wallet-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <p className="wallet-modal-desc">
          Select a wallet to connect to Mine A Bitcoin
        </p>

        <div className="wallet-list">
          {wallets.map((w) => (
            <button
              key={w.id}
              className={`wallet-item${!w.installed ? " wallet-disabled" : ""}`}
              disabled={!w.installed}
              onClick={() => onSelect(w)}
            >
              <img
                src={w.icon}
                alt=""
                className="wallet-icon"
                width={40}
                height={40}
              />
              <div className="wallet-info">
                <span className="wallet-name">{w.name}</span>
                <span className="wallet-status">
                  {w.installed ? (
                    <span className="wallet-installed">Detected</span>
                  ) : (
                    <span className="wallet-not-installed">Not Installed</span>
                  )}
                </span>
              </div>
              {!w.installed && w.webUrl && (
                <a
                  href={w.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wallet-install-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  Install
                </a>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ConnectWallet({
  address,
  onConnect,
  onDisconnect,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  async function handleSelectWallet(wallet: WalletInfo) {
    if (!wallet.installed) return;

    // Close our modal immediately so the wallet extension's own
    // dialog is visible and not trapped underneath.
    setModalOpen(false);
    // Ensure scroll is restored since modal unmount handles it,
    // but also guard against wallet extensions locking the body.
    document.body.style.overflow = "";

    try {
      const response = await connect({
        approvedProviderIds: [wallet.id],
      });
      console.log("Wallet response addresses:", JSON.stringify(response.addresses));
      // Find STX address: match by symbol or by address format (starts with "S")
      const stxAddr = response.addresses.find(
        (a) => a.symbol === "STX" || a.address.startsWith("SP") || a.address.startsWith("ST")
      );
      if (stxAddr) {
        onConnect(stxAddr.address);
      }
    } catch (err) {
      // User rejected or wallet errored — re-open our modal so they
      // can pick a different wallet without clicking the button again.
      console.error("Wallet connection failed:", err);
      setModalOpen(true);
    } finally {
      // Always ensure body scroll is unlocked after wallet dialog closes,
      // unless our modal is about to re-mount (which will lock it again).
      requestAnimationFrame(() => {
        if (!document.querySelector(".wallet-modal-overlay")) {
          document.body.style.overflow = "";
        }
      });
    }
  }

  if (address) {
    return (
      <div className="wallet-bar">
        <span className="wallet-addr">
          {address.slice(0, 8)}...{address.slice(-4)}
        </span>
        <button className="btn btn-sm" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
        Connect Wallet
      </button>
      {modalOpen && (
        <WalletModal
          onSelect={handleSelectWallet}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
