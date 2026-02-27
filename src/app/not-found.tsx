import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-xl text-muted-foreground">Página não encontrada</p>
      <Button asChild>
        <Link href="/dashboard">Voltar para o Dashboard</Link>
      </Button>
    </div>
  );
}