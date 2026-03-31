import { Metadata } from "next";
import { TermsOfServiceClient } from "./TermsOfServiceClient";

export const metadata: Metadata = {
  title: "Terms of Service | AlphaStats",
  description:
    "Terms of Service for AlphaStats — read our terms and conditions for using the platform.",
};

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />;
}
