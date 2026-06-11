"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { pullFinanceDataFromCloudWithMeta, pushFinanceDataToCloud } from "@/lib/cloud/sync";
import { useFinanceStore } from "@/store/use-finance-store";
import type { FinanceData } from "@/types/finance";

const hasMeaningfulData = (data: FinanceData) =>
  data.cards.length > 0 ||
  data.purchases.length > 0 ||
  data.recurringExpenses.length > 0 ||
  data.invoicePayments.length > 0;

const fingerprint = (data: FinanceData) => JSON.stringify(data);

export function CloudSyncRunner() {
  const auth = useSupabaseAuth();
  const hydrated = useFinanceStore((state) => state.hydrated);
  const cards = useFinanceStore((state) => state.cards);
  const purchases = useFinanceStore((state) => state.purchases);
  const recurringExpenses = useFinanceStore((state) => state.recurringExpenses);
  const invoicePayments = useFinanceStore((state) => state.invoicePayments);
  const categories = useFinanceStore((state) => state.categories);
  const replaceData = useFinanceStore((state) => state.replaceData);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const lastPushedRef = useRef("");
  const userId = auth.user?.id ?? null;

  const data = useMemo(
    () => ({ cards, purchases, recurringExpenses, invoicePayments, categories }),
    [cards, purchases, recurringExpenses, invoicePayments, categories],
  );

  useEffect(() => {
    if (!auth.configured || !userId || !hydrated || readyUserId === userId) return;

    let canceled = false;

    const runInitialSync = async () => {
      try {
        const remote = await pullFinanceDataFromCloudWithMeta(userId);
        const localHasData = hasMeaningfulData(data);

        if (remote?.data && !localHasData) {
          await replaceData(remote.data);
          lastPushedRef.current = fingerprint(remote.data);
        } else if (!remote?.data && localHasData) {
          await pushFinanceDataToCloud(userId, data);
          lastPushedRef.current = fingerprint(data);
        } else {
          lastPushedRef.current = fingerprint(data);
        }

        if (!canceled) setReadyUserId(userId);
      } catch (error) {
        console.error("Falha na sincronização inicial com Supabase", error);
      }
    };

    void runInitialSync();

    return () => {
      canceled = true;
    };
  }, [auth.configured, data, hydrated, readyUserId, replaceData, userId]);

  useEffect(() => {
    if (!auth.configured || !userId || readyUserId !== userId || !hydrated) return;
    if (!hasMeaningfulData(data)) return;

    const nextFingerprint = fingerprint(data);
    if (nextFingerprint === lastPushedRef.current) return;

    const timeout = window.setTimeout(() => {
      pushFinanceDataToCloud(userId, data)
        .then(() => {
          lastPushedRef.current = nextFingerprint;
        })
        .catch((error) => {
          console.error("Falha ao salvar dados no Supabase", error);
        });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [auth.configured, data, hydrated, readyUserId, userId]);

  return null;
}
