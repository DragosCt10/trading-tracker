import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="w-full">
      <div className="container mx-auto px-4">
        <div className="py-6 text-center space-y-2">
          <div className="text-sm text-muted-foreground">
            © {YEAR}{" "}
            <Link href="/" className="underline-offset-4 hover:underline text-foreground font-semibold">
              TI Journal
            </Link>
            &nbsp;|&nbsp; Built for traders, by traders.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
