"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      const cleanupDevelopmentWorker = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const matchingRegistrations = registrations.filter((registration) => registration.scope.startsWith(window.location.origin));
        await Promise.all(matchingRegistrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith("cartaocontrol-")).map((key) => caches.delete(key)));
        }

        if (matchingRegistrations.length && sessionStorage.getItem("cartaocontrol-sw-cleaned") !== "true") {
          sessionStorage.setItem("cartaocontrol-sw-cleaned", "true");
          window.location.reload();
        }
      };

      cleanupDevelopmentWorker().catch((error) => {
        console.warn("Service worker de desenvolvimento não removido", error);
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker não registrado", error);
    });
  }, []);

  return null;
}
