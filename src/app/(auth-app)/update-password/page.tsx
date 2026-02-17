import { Suspense } from 'react';
import UpdatePasswordClient from './UpdatePasswordClient';

export default function UpdatePassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    }>
      <UpdatePasswordClient />
    </Suspense>
  );
}