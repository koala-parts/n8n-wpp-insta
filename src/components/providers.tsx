"use client";

import { Toaster } from "sonner";

type ProvidersProps = {
  children: React.ReactNode;
};

const Providers = ({ children }: ProvidersProps) => {
  return (
    <>
      {children}
      <Toaster richColors />
    </>
  );
};

export default Providers;
