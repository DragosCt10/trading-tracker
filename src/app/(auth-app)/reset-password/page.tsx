import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--tc-primary)' }}></div>
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  );
}