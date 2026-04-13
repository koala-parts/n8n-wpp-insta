"use client";

import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Bot,
  Users,
  CircleHelp,
  Bell,
  BellDot,
  Trash2,
  Sun,
  Moon,
  Instagram,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ContactAvatar } from "@/components/contact-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatDatePtBr } from "@/lib/formatters";
import { createBrowserSupabase } from "@/lib/supabase";
import getMessagesData from "@/data/get-messages";
import getBotChatsData from "@/data/get-bot-chats";
import getAllChatsData from "@/data/get-all-chats";
import {
  ChatActionError,
  approveTransferRequest,
  rejectTransferRequest,
} from "@/lib/chat-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageTemplatesSheet } from "@/app/(protected)/chats/components/message-templates-sheet";

/* ========================= MENU ========================= */

const mainItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    countKey: null,
  },
  {
    title: "Meus Chats",
    url: "/chats",
    icon: MessageSquare,
    countKey: "myChats",
  },
  {
    title: "Contatos",
    url: "/contatos",
    icon: Users,
    countKey: "contacts",
  },
  {
    title: "Chats do Bot",
    url: "/chats-bot",
    icon: Bot,
    countKey: "botChats",
  },
  {
    title: "Todas as Conversas",
    url: "/chats-all",
    icon: Users,
    countKey: "allChats",
  },
  {
    title: "Instagram",
    url: "/instagram",
    icon: Instagram,
    countKey: "instagramHuman",
    isDivider: true,
  },
];

type SidebarCountKey =
  | "myChats"
  | "botChats"
  | "allChats"
  | "contacts"
  | "instagramHuman";

type SidebarChatCounts = {
  myChats: number;
  botChats: number;
  allChats: number;
  contacts: number;
  instagramHuman: number;
};

/* ========================= TYPES ========================= */

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type TransferNotification = {
  id: string;
  contactId: string;
  contactName: string;
  transferredByName: string;
  transferredById: string | null;
  ownerUserId: string | null;
  contactPhone: string;
  stage: string;
  type: "transfer" | "request" | "instagram-help";
  transferredAt: string | null;
  readKey: string;
  userIdInstagram?: string | null;
};

type AssignmentRow = {
  id?: string;
  contact_id?: string;
  user_id?: string;
  transferred_by?: string;
  assigned_at?: string;
  user_id_instagram?: string | null;
  users?: { id?: string; name?: string } | null;
  whatsapp_contacts?: { name?: string; phone?: string } | null;
};

/* ========================= LOCAL STORAGE ========================= */

const getReadNotificationsStorageKey = (userId: string) =>
  `transfer-notifications-read:${userId}`;

const getDismissedNotificationsStorageKey = (userId: string) =>
  `transfer-notifications-dismissed:${userId}`;

const loadSet = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set<string>();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set<string>();
  }
};

const saveSet = (key: string, set: Set<string>) =>
  localStorage.setItem(key, JSON.stringify(Array.from(set)));

/* ========================= COMPONENT ========================= */

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<TransferNotification[]>([]);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  const [chatCounts, setChatCounts] = useState<SidebarChatCounts>({
    myChats: 0,
    botChats: 0,
    allChats: 0,
    contacts: 0,
    instagramHuman: 0,
  });

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const isItemActive = (url: string) =>
    pathname === url || pathname.startsWith(`${url}/`);

  const formatCount = (n: number) => (n > 99 ? "99+" : String(n));

  /* ========================= USER ========================= */

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setReadKeys(loadSet(getReadNotificationsStorageKey(user.id)));
    setDismissedKeys(loadSet(getDismissedNotificationsStorageKey(user.id)));
  }, [user?.id]);

  /* ========================= THEME ========================= */

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const finalTheme =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    setTheme(finalTheme);
    document.documentElement.classList.toggle("dark", finalTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  /* ========================= COUNTS ========================= */

  const loadCounts = useCallback(async () => {
    if (!user?.id) return;

    const supabase = createBrowserSupabase();

    const [my, bot, all, contactsRes, instaRes] = await Promise.all([
      getMessagesData({ userId: user.id, supabase }),
      getBotChatsData(supabase),
      getAllChatsData(supabase),
      fetch("/api/contacts"),
      fetch("/api/instagram/count"),
    ]);

    const contacts = (await contactsRes.json())?.contacts?.length ?? 0;
    const insta = (await instaRes.json())?.count ?? 0;

    setChatCounts({
      myChats: my.contacts.length,
      botChats: bot.length,
      allChats: all.length,
      contacts,
      instagramHuman: insta,
    });
  }, [user?.id]);

  useEffect(() => {
    loadCounts();
    const i = setInterval(loadCounts, 30000);
    return () => clearInterval(i);
  }, [loadCounts]);

  /* ========================= ACTIONS ========================= */

  const handleSignOut = async () => {
    await fetch("/api/session/logout", { method: "POST" });
    localStorage.removeItem("user");
    router.push("/authentication");
  };

  /* ========================= RENDER ========================= */

  return (
    <>
      <Sidebar>
        <SidebarHeader className="flex items-center justify-between px-6 py-4 border-b gap-2">
          <Image src="/logo.png" alt="logo" width={40} height={40} />
          <Button variant="ghost" onClick={() => setNotificationsOpen(true)}>
            <Bell />
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>WhatsApp</SidebarGroupLabel>

            <SidebarMenu>
              {mainItems.map((item, i) => (
                <Fragment key={item.title}>
                  {item.isDivider && <Separator />}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isItemActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                        {item.countKey && (
                          <span className="ml-auto text-xs">
                            {formatCount(chatCounts[item.countKey])}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/help" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent">
                  <CircleHelp className="h-4 w-4" />
                  <span className="text-sm">Ajuda</span>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <button onClick={toggleTheme} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent w-full">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span className="text-sm">{theme === "dark" ? "Escuro" : "Claro"}</span>
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="flex flex-col gap-1 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {user?.name?.slice(0, 2) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-sm font-medium truncate">{user?.name || "Usuário"}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <MessageTemplatesSheet
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        userId={user?.id ?? ""}
        mode="manage"
      />
    </>
  );
}