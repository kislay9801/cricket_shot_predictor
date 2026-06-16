"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface LastAnalysis {
  file: File | null;
  previewUrl: string | null;
  shot: string | null;
}

interface Ctx extends LastAnalysis {
  setLast: (v: LastAnalysis) => void;
}

const LastAnalysisContext = createContext<Ctx>({
  file: null,
  previewUrl: null,
  shot: null,
  setLast: () => {},
});

export function LastAnalysisProvider({ children }: { children: ReactNode }) {
  const [v, setV] = useState<LastAnalysis>({ file: null, previewUrl: null, shot: null });
  return (
    <LastAnalysisContext.Provider value={{ ...v, setLast: setV }}>
      {children}
    </LastAnalysisContext.Provider>
  );
}

export const useLastAnalysis = () => useContext(LastAnalysisContext);
