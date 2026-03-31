import { Metadata } from "next";
import { PrivacyPolicyClient } from "./PrivacyPolicyClient";

export const metadata: Metadata = {
  title: "Privacy Policy | AlphaStats",
  description:
    "Privacy Policy for AlphaStats — learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
