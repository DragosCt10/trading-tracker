'use client';

import { createContext, useContext, useState } from 'react';

type BECalcContextType = {
  beCalcEnabled: boolean;
  toggleBECalc: () => void;
};

const BECalcContext = createContext<BECalcContextType>({
  beCalcEnabled: false,
  toggleBECalc: () => {},
});

export function BECalcProvider({ children }: { children: React.ReactNode }) {
  const [beCalcEnabled, setBeCalcEnabled] = useState(false);
  return (
    <BECalcContext.Provider value={{ beCalcEnabled, toggleBECalc: () => setBeCalcEnabled((p) => !p) }}>
      {children}
    </BECalcContext.Provider>
  );
}

export const useBECalc = () => useContext(BECalcContext);
