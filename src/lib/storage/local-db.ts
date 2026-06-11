import { openDB, type DBSchema } from "idb";
import { createEmptyFinanceData } from "@/data/seed";
import { financeDataSchema } from "@/lib/validation";
import type { FinanceData } from "@/types/finance";

const DB_NAME = "cartaocontrol";
const DB_VERSION = 1;
const DATA_KEY = "finance-data";

interface CartaoControlDb extends DBSchema {
  kv: {
    key: string;
    value: unknown;
  };
}

const canUseIndexedDb = () => typeof window !== "undefined" && "indexedDB" in window;

const getDb = () =>
  openDB<CartaoControlDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    },
  });

export const loadFinanceData = async (): Promise<FinanceData> => {
  if (!canUseIndexedDb()) return createEmptyFinanceData();

  try {
    const db = await getDb();
    const data = await db.get("kv", DATA_KEY);
    if (!data) return createEmptyFinanceData();
    return financeDataSchema.parse(data);
  } catch (error) {
    console.error("Falha ao carregar IndexedDB", error);
    return createEmptyFinanceData();
  }
};

export const saveFinanceData = async (data: FinanceData) => {
  if (!canUseIndexedDb()) return;

  try {
    const db = await getDb();
    await db.put("kv", data, DATA_KEY);
  } catch (error) {
    console.error("Falha ao salvar IndexedDB", error);
  }
};

export const clearFinanceData = async () => {
  if (!canUseIndexedDb()) return;

  try {
    const db = await getDb();
    await db.delete("kv", DATA_KEY);
  } catch (error) {
    console.error("Falha ao limpar IndexedDB", error);
  }
};
