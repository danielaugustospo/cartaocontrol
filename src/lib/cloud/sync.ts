"use client";

import { getSupabaseClient } from "@/lib/cloud/supabase";
import { financeDataSchema } from "@/lib/validation";
import type { FinanceData } from "@/types/finance";

const TABLE_NAME = "finance_data";

export type CloudSyncResult = {
  updatedAt?: string;
};

export type CloudFinanceData = {
  data: FinanceData;
  updatedAt?: string;
};

export const pushFinanceDataToCloud = async (userId: string, data: FinanceData): Promise<CloudSyncResult> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado.");

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      user_id: userId,
      payload: data,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
  return { updatedAt };
};

export const pullFinanceDataFromCloudWithMeta = async (userId: string): Promise<CloudFinanceData | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.payload) return null;

  return {
    data: financeDataSchema.parse(data.payload),
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : undefined,
  };
};

export const pullFinanceDataFromCloud = async (userId: string): Promise<FinanceData | null> => {
  const result = await pullFinanceDataFromCloudWithMeta(userId);
  return result?.data ?? null;
};
