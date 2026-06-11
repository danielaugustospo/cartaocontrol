import type { Metadata } from "next";
import { InvoicesScreen } from "@/components/screens/invoices-screen";

export const metadata: Metadata = {
  title: "Faturas",
};

export default function InvoicesPage() {
  return <InvoicesScreen />;
}
