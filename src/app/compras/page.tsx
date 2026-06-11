import type { Metadata } from "next";
import { PurchasesScreen } from "@/components/screens/purchases-screen";

export const metadata: Metadata = {
  title: "Compras",
};

export default function PurchasesPage() {
  return <PurchasesScreen />;
}
