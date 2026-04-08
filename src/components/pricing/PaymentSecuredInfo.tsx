import Image from 'next/image';
import { Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PaymentSecuredInfo({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-5 text-center', className)}>
      <p className="flex items-center gap-1 text-sm font-medium text-foreground/80">
        <Lock className="h-3.5 w-3.5" />
        Secured Payment by <span className="underline m-0 font-semibold">Lemon Squeezy</span> with:
      </p>

      <div className="flex items-center justify-center gap-3">
        <span className="flex h-8 items-center rounded-md bg-white px-2.5 shadow-sm ring-1 ring-black/10">
          <Image src="/icons/payments/visa.svg" alt="Visa" width={61} height={20} className="h-3 w-auto" />
        </span>
        <span className="flex h-8 items-center rounded-md bg-white px-2.5 shadow-sm ring-1 ring-black/10">
          <Image src="/icons/payments/mastercard.svg" alt="Mastercard" width={66} height={40} className="h-4.5 w-auto" />
        </span>
        <span className="flex h-8 items-center rounded-md bg-white px-1.5 shadow-sm ring-1 ring-black/10">
          <Image src="/icons/payments/applepay.svg" alt="Apple Pay" width={120} height={80} className="h-8 w-auto" />
        </span>
        <span className="flex h-8 items-center rounded-md bg-white px-2.5 shadow-sm ring-1 ring-black/10">
          <Image src="/icons/payments/googlepay.svg" alt="Google Pay" width={80} height={38} className="h-4.5 w-auto" />
        </span>
        <span className="flex h-8 items-center rounded-md bg-white px-1.5 shadow-sm ring-1 ring-black/10">
          <Image src="/icons/payments/paypal.svg" alt="PayPal" width={80} height={38} className="h-5 w-auto" />
        </span>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        If you are a Registered Company inside the European Union you will be able to add your VAT ID after you press &quot;Buy Now&quot;
      </p>
    </div>
  );
}
