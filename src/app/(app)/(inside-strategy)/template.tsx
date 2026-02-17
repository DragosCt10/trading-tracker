import { ReactNode } from 'react';

interface InsideStrategyTemplateProps {
  children: ReactNode;
}

export default function InsideStrategyTemplate({ children }: InsideStrategyTemplateProps) {
  return <>{children}</>;
}
