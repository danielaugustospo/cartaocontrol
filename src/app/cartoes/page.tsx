import type { Metadata } from "next";
import { CardsScreen } from "@/components/screens/cards-screen";

export const metadata: Metadata = {
  title: "Cartões",
};

export default function CardsPage() {
  return <CardsScreen />;
}
