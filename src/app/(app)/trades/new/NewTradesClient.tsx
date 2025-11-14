'use client';

import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import NewTradeForm from './_components/NewTradeForm';
import AppLayout from '@/components/shared/layout/AppLayout';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// icon for spinner
import { Loader2 } from 'lucide-react';

export default function NewTradePage() {
  const { selection, actionBarloading } = useActionBarSelection();

  if (actionBarloading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  const mode = selection.mode as 'live' | 'backtesting' | 'demo' | string;

  return (
    <AppLayout>
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card className="shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Add New Trade</CardTitle>
              </div>
              <CardDescription>
                Adding trade for <span className="font-medium text-foreground">{mode}</span> mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewTradeForm selection={selection} actionBarLoading={actionBarloading} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
