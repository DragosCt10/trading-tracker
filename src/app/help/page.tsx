import { Metadata } from "next";
import { HelpCenterClient } from "./HelpCenterClient";

export const metadata: Metadata = {
  title: "Help Center | AlphaStats",
  description:
    "Find answers to common questions about AlphaStats — getting started, trading journal, statistics, account management, and more.",
};

export default function HelpPage() {
  return <HelpCenterClient />;
}
