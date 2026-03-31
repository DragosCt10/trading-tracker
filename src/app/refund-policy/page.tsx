import { Metadata } from "next";
import { RefundPolicyClient } from "./RefundPolicyClient";

export const metadata: Metadata = {
  title: "Refund Policy | AlphaStats",
  description:
    "Refund Policy for AlphaStats — understand our refund, cancellation, and billing policies.",
};

export default function RefundPolicyPage() {
  return <RefundPolicyClient />;
}
