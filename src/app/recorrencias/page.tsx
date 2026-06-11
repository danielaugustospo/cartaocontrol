import type { Metadata } from "next";
import { RecurringScreen } from "@/components/screens/recurring-screen";

export const metadata: Metadata = {
  title: "Recorrências",
};

export default function RecurringPage() {
  return <RecurringScreen />;
}
