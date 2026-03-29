import { Suspense } from 'react';
import UpdatePasswordClient from './UpdatePasswordClient';

export default function UpdatePassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--tc-primary)' }}></div>
      </div>
    }>
      <UpdatePasswordClient />
    </Suspense>
  );
}