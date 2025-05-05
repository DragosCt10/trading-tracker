
import Link from "next/link";
const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="flex w-full flex-row flex-wrap items-center justify-center gap-x-12 gap-y-3 border-t border-stone-200 py-4 text-center md:justify-between mt-10">
      <div className="container mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="text-center lg:text-left">
            <div className="text-sm mt-2 py-1 font-normal text-stone-500">
              Copyright © {YEAR} &nbsp; 
              <Link href="/" className="text-inherit transition-all">Trading Tracker</Link>
              &nbsp;• UI design by <Link href="https://www.creative-tim.com/david-ui" className="text-inherit hover:text-stone-700 transition-all underline">David UI</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
