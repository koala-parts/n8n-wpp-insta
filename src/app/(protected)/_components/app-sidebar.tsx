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
  [key: string]: number;
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

const loadSet = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set<string>();
    return new Set<string>(JSON.parse(raw));
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
  const [loadingNotifications, setLoadingNotifications] = useState(false);
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

  const [processingRequestKey, setProcessingRequestKey] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const pendingNotifications = notifications.filter(
    (notification) => !readKeys.has(notification.readKey)
  );

  const hasPendingNotifications = pendingNotifications.length > 0;

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

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    const supabase = createBrowserSupabase();

    try {
      setLoadingNotifications(true);

      // Transfer notifications (seu código original)
      const { data: transferData, error: transferError } = await supabase
        .from("user_active_contacts")
        .select(
          "id, contact_id, user_id, transferred_by, assigned_at, users!user_active_contacts_transferred_by_fkey(id, name), whatsapp_contacts!user_active_contacts_contact_id_fkey(name, phone)"
        )
        .eq("user_id", user.id)
        .eq("active", true)
        .not("transferred_by", "is", null)
        .order("assigned_at", { ascending: false })
        .limit(50);

      if (transferError) {
        throw transferError;
      }

      const rows = (transferData ?? []) as AssignmentRow[];
      const transferNotifications = rows
        .map((row, index) => {
          const contactId = typeof row.contact_id === "string" ? row.contact_id : "";
          if (!contactId) return null;

          const rawAssignedAt =
            typeof row.assigned_at === "string" && row.assigned_at.trim() !== ""
              ? row.assigned_at
              : null;

          const fallbackId =
            typeof row.id === "string" && row.id.trim() !== "" ? row.id : `${contactId}-${index}`;
          const readKey = `${fallbackId}:${rawAssignedAt ?? "-"}`;

          const transferredById =
            typeof row.transferred_by === "string" && row.transferred_by.trim() !== ""
              ? row.transferred_by.trim()
              : null;
          const ownerUserId =
            typeof row.user_id === "string" && row.user_id.trim() !== ""
              ? row.user_id.trim()
              : null;
          const contactPhone =
            typeof row.whatsapp_contacts?.phone === "string" ? row.whatsapp_contacts.phone : "";

          return {
            id: fallbackId,
            contactId,
            contactName:
              typeof row.whatsapp_contacts?.name === "string" &&
              row.whatsapp_contacts.name.trim() !== ""
                ? row.whatsapp_contacts.name.trim()
                : "Contato sem nome",
            transferredByName:
              typeof row.users?.name === "string" && row.users.name.trim() !== ""
                ? row.users.name.trim()
                : "Usuário",
            transferredById,
            ownerUserId,
            contactPhone,
            stage: "-",
            type: "transfer" as const,
            transferredAt: rawAssignedAt,
            readKey,
          } as TransferNotification;
        })
        .filter((row): row is TransferNotification => row !== null);

      // Instagram notifications (buscar nome do usuário via API)
      const { data: instaData, error: instaError } = await supabase
        .from("user_active_contacts")
        .select("id, user_id, user_id_instagram, assigned_at")
        .eq("active", true)
        .not("user_id_instagram", "is", null)
        .order("assigned_at", { ascending: false })
        .limit(50);

      if (instaError) {
        throw instaError;
      }

      const instaNotifications = await Promise.all(
        (instaData ?? []).map(async (row) => {
          let instaName = row.user_id_instagram;
          
          try {
            const profileRes = await fetch(`/api/instagram/profile?userId=${row.user_id_instagram}`);
            const profileData = await profileRes.json();
            instaName = profileData.username;
          } catch {
            // use fallback
          }

          return {
            id: row.id,
            contactId: row.id,
            contactName: instaName,
            transferredByName: "",
            transferredById: null,
            ownerUserId: null,
            contactPhone: "",
            stage: "-",
            type: "instagram-help" as const,
            transferredAt: row.assigned_at,
            readKey: `instagram-help:${row.id}`,
            userIdInstagram: row.user_id_instagram,
          };
        })
      );

      const combined = [...transferNotifications, ...instaNotifications];

      const filtered = combined.filter(
        (notification) => !dismissedKeys.has(notification.readKey)
      );

      setNotifications(filtered);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [dismissedKeys, user?.id]);

  useEffect(() => {
    loadNotifications();
    const i = setInterval(loadNotifications, 30000);
    return () => clearInterval(i);
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !readKeys.has(n.readKey)).length;

  const handleClickNotification = (notification: TransferNotification) => {
    if (!user?.id) return;

    const updatedReadKeys = new Set(readKeys);
    updatedReadKeys.add(notification.readKey);
    setReadKeys(updatedReadKeys);
    saveSet(getReadNotificationsStorageKey(user.id), updatedReadKeys);

    setNotificationsOpen(false);
    
    if (notification.type === "instagram-help") {
      router.push(`/instagram?contactId=${notification.contactId}`);
    } else {
      router.push(`/chats-all/${notification.contactId}`);
    }
  };

  const handleDismissNotification = (notification: TransferNotification) => {
    if (!user?.id) return;

    const updatedDismissedKeys = new Set(dismissedKeys);
    updatedDismissedKeys.add(notification.readKey);
    setDismissedKeys(updatedDismissedKeys);
    saveSet(getDismissedNotificationsStorageKey(user.id), updatedDismissedKeys);

    setNotifications((previous) =>
      previous.filter((item) => item.readKey !== notification.readKey)
    );
  };

  const handleApproveRequest = async (notification: TransferNotification) => {
    if (!user?.id || notification.type !== "request") return;
    if (!notification.transferredById) {
      return;
    }

    try {
      setProcessingRequestKey(notification.readKey);
      await approveTransferRequest({
        contactId: notification.contactId,
        requesterUserId: notification.transferredById,
        requesterUserName: notification.transferredByName,
        currentUserId: user.id,
        currentUserName: user.name,
        contactPhone: notification.contactPhone,
        stage: notification.stage || "-",
      });

      await Promise.all([loadNotifications(), loadCounts()]);
    } catch (error) {
      // handle error
    } finally {
      setProcessingRequestKey(null);
    }
  };

  const handleRejectRequest = async (notification: TransferNotification) => {
    if (!user?.id || notification.type !== "request") return;

    try {
      setProcessingRequestKey(notification.readKey);
      await rejectTransferRequest({
        contactId: notification.contactId,
        currentUserName: user.name,
        contactPhone: notification.contactPhone,
        stage: notification.stage || "-",
      });

      await Promise.all([loadNotifications(), loadCounts()]);
    } catch (error) {
      // handle error
    } finally {
      setProcessingRequestKey(null);
    }
  };

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
          <Button variant="ghost" onClick={() => setNotificationsOpen(true)} className="relative">
            <Bell />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
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

      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="left" className="flex flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-5">
            <SheetTitle className="text-lg">Notificações</SheetTitle>
            <SheetDescription>
              {pendingNotifications.length > 0
                ? `${pendingNotifications.length} ${
                    pendingNotifications.length === 1 ? "notificação" : "notificações"
                  } pendente(s)`
                : "Nenhuma notificação pendente"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {loadingNotifications ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground text-sm">Carregando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const isRead = readKeys.has(notification.readKey);
                  const isInstagramHelp = notification.type === "instagram-help";

                  return (
                    <div
                      key={notification.readKey}
                      className={cn(
                        "group relative w-full rounded-lg border p-3 text-left transition-all hover:border-primary hover:bg-accent focus-within:border-primary focus-within:bg-accent",
                        isRead ? "border-border bg-muted/30" : "border-primary/30 bg-primary/5"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleClickNotification(notification)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        {isInstagramHelp ? (
                          <div className="h-8 w-8 shrink-0 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                            <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                          </div>
                        ) : (
                          <ContactAvatar
                            name={notification.contactName}
                            className="h-8 w-8 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight">
                            {notification.contactName}
                          </p>
                          <p className="text-muted-foreground truncate text-xs leading-tight">
                            {isInstagramHelp
                              ? "Precisa de ajuda"
                              : notification.type === "request"
                              ? `${notification.transferredByName} solicitou a transferência`
                              : `Transferido por ${notification.transferredByName}`}
                          </p>
                          {notification.transferredAt && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              {formatDatePtBr(notification.transferredAt, { preset: "full" })}
                            </p>
                          )}
                        </div>
                        {!isRead && !isInstagramHelp && (
                          <Badge variant="default" className="ml-2 shrink-0">
                            Novo
                          </Badge>
                        )}
                      </button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDismissNotification(notification);
                        }}
                        aria-label="Apagar notificação"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {pendingNotifications.length > 0 && (
            <div className="border-t px-4 py-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (!user?.id) return;
                  const allReadKeys = new Set(readKeys);
                  notifications.forEach((notification) => {
                    allReadKeys.add(notification.readKey);
                  });
                  setReadKeys(allReadKeys);
                  saveSet(getReadNotificationsStorageKey(user.id), allReadKeys);
                }}
              >
                Marcar todas como lidas
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}