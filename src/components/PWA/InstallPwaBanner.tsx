import React, { useState, useEffect } from 'react';

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || dismissed || !deferredPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-banner">
      <div className="pwa-banner-content">
        <div className="pwa-banner-icon">📲</div>
        <div className="pwa-banner-text">
          <strong>Cài đặt Kỳ Đạo App</strong>
          <span>Chơi cờ mượt mà, toàn màn hình và hoạt động cả khi không có mạng (Offline)</span>
        </div>
      </div>
      <div className="pwa-banner-actions">
        <button className="btn-primary btn-sm" onClick={handleInstallClick}>
          Cài đặt ngay
        </button>
        <button
          className="btn-dismiss"
          onClick={() => setDismissed(true)}
          title="Đóng thông báo"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
