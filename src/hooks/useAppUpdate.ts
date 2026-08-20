import { useState, useEffect, useCallback, useRef } from 'react';

export function useAppUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const currentVersionRef = useRef<string | null>(null);

  // Check version.json on server and Service Worker registration
  const checkForUpdate = useCallback(async () => {
    // 1. Check Service Worker registration state
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          // If a new worker is already waiting
          if (reg.waiting) {
            waitingWorkerRef.current = reg.waiting;
            setHasUpdate(true);
            return;
          }

          // Trigger background check for updated sw.js
          reg.update().catch(() => {});

          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (
                  installingWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  waitingWorkerRef.current = installingWorker;
                  setHasUpdate(true);
                }
              };
            }
          };
        }
      } catch (err) {
        console.warn('[PWA Update] SW check error:', err);
      }
    }

    // 2. HTTP Poll version.json as a fallback
    try {
      const response = await fetch(`./version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.buildVersion) {
          if (!currentVersionRef.current) {
            // First run, initialize current version baseline
            currentVersionRef.current = data.buildVersion;
          } else if (currentVersionRef.current !== data.buildVersion) {
            console.log('[PWA Update] Detected new version on server:', data.buildVersion);
            setHasUpdate(true);
          }
        }
      }
    } catch {
      // Offline or network unavailable
    }
  }, []);

  useEffect(() => {
    // Initial check on load
    checkForUpdate();

    // Check periodically every 25 seconds
    const interval = setInterval(checkForUpdate, 25000);

    // Check immediately when user returns to/focuses the app window
    const handleFocus = () => {
      checkForUpdate();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', checkForUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', checkForUpdate);
    };
  }, [checkForUpdate]);

  // Apply update immediately
  const applyUpdate = useCallback(() => {
    console.log('[PWA Update] Applying upgrade now...');

    // Tell waiting worker to take over immediately
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    } else if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }

    // Clear stale caches and reload
    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {})
        .finally(() => {
          window.location.reload();
        });
    } else {
      window.location.reload();
    }
  }, []);

  return {
    hasUpdate,
    applyUpdate,
    checkForUpdate,
  };
}
