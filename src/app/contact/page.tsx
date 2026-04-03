import { Metadata } from "next";
import { ContactClient } from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact | AlphaStats",
  description:
    "Get in touch with the AlphaStats team. Report bugs, request features, ask questions, or explore partnerships.",
};

export default function ContactPage() {
  return <ContactClient />;
}
