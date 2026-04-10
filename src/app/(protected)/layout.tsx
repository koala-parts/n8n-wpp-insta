import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { verifySessionToken } from "@/lib/session";

import { AppSidebar } from "./_components/app-sidebar";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const sessionToken = (await cookies()).get("session")?.value;

  if (!sessionToken) {
    redirect("/authentication");
  }

  const session = await verifySessionToken(sessionToken);
  if (!session) {
    redirect("/authentication");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
