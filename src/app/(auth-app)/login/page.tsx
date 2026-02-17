import { Suspense } from 'react';
import LoginPage from './LoginPage';

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    }>
      <LoginPage />
    </Suspense>
  );
}
