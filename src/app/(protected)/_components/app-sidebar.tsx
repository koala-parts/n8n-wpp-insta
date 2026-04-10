"use client";

<<<<<<< HEAD
import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
=======
import { useCallback, useEffect, useRef, useState } from "react";
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
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
<<<<<<< HEAD
  Instagram,
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
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
<<<<<<< HEAD
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageTemplatesSheet } from "@/app/(protected)/chats/components/message-templates-sheet";

const mainItems = [
=======
import { toast } from "sonner";
import { MessageTemplatesSheet } from "@/app/(protected)/chats/components/message-templates-sheet";

const items = [
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
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
<<<<<<< HEAD
    title: "Contatos",
    url: "/contatos",
    icon: Users,
    countKey: "contacts",
  },
  {
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
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
<<<<<<< HEAD
  {
    title: "Instagram",
    url: "/instagram",
    icon: Instagram,
    countKey: "instagramHuman",
    isDivider: true,
  },
];

type SidebarCountKey = "myChats" | "botChats" | "allChats" | "contacts" | "instagramHuman";
=======
];

type SidebarCountKey = "myChats" | "botChats" | "allChats";
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218

type SidebarChatCounts = {
  myChats: number;
  botChats: number;
  allChats: number;
<<<<<<< HEAD
  contacts: number;
  instagramHuman: number;
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
};

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
<<<<<<< HEAD
  type: "transfer" | "request" | "instagram-help";
  transferredAt: string | null;
  readKey: string;
  userIdInstagram?: string | null;
=======
  type: "transfer" | "request";
  transferredAt: string | null;
  readKey: string;
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
};

type AssignmentRow = {
  id?: string;
  contact_id?: string;
  user_id?: string;
  transferred_by?: string;
  assigned_at?: string;
<<<<<<< HEAD
  user_id_instagram?: string | null;
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
  users?: {
    id?: string;
    name?: string;
  } | null;
  whatsapp_contacts?: {
    name?: string;
    phone?: string;
  } | null;
};

function getReadNotificationsStorageKey(userId: string) {
  return `transfer-notifications-read:${userId}`;
}

function getDismissedNotificationsStorageKey(userId: string) {
  return `transfer-notifications-dismissed:${userId}`;
}

function loadReadNotifications(userId: string) {
  try {
    const raw = localStorage.getItem(getReadNotificationsStorageKey(userId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value) => typeof value === "string" && value.trim() !== ""));
  } catch {
    return new Set<string>();
  }
}

function saveReadNotifications(userId: string, keys: Set<string>) {
  localStorage.setItem(getReadNotificationsStorageKey(userId), JSON.stringify(Array.from(keys)));
}

function loadDismissedNotifications(userId: string) {
  try {
    const raw = localStorage.getItem(getDismissedNotificationsStorageKey(userId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value) => typeof value === "string" && value.trim() !== ""));
  } catch {
    return new Set<string>();
  }
}

function saveDismissedNotifications(userId: string, keys: Set<string>) {
  localStorage.setItem(
    getDismissedNotificationsStorageKey(userId),
    JSON.stringify(Array.from(keys))
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<TransferNotification[]>([]);
  const [readNotificationKeys, setReadNotificationKeys] = useState<Set<string>>(new Set());
  const [dismissedNotificationKeys, setDismissedNotificationKeys] = useState<Set<string>>(
    new Set()
  );
  const [chatCounts, setChatCounts] = useState<SidebarChatCounts>({
    myChats: 0,
    botChats: 0,
    allChats: 0,
<<<<<<< HEAD
    contacts: 0,
    instagramHuman: 0,
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
  });
  const [processingRequestKey, setProcessingRequestKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const pendingNotifications = notifications.filter(
    (notification) => !readNotificationKeys.has(notification.readKey)
  );

  const hasPendingNotifications = pendingNotifications.length > 0;

  const isItemActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);

  const formatCount = (value: number) => (value > 99 ? "99+" : String(value));

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = localStorage.getItem("user");
        
        if (userStr) {
          const userData = JSON.parse(userStr) as User;
          setUser(userData);
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        // no-op
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setReadNotificationKeys(loadReadNotifications(user.id));
  }, [user?.id]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      document.documentElement.classList.toggle("dark", storedTheme === "dark");
      return;
    }

    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme = prefersDark ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setDismissedNotificationKeys(loadDismissedNotifications(user.id));
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    const supabase = createBrowserSupabase();

    try {
      setLoadingNotifications(true);

      const { data, error } = await supabase
        .from("user_active_contacts")
        .select(
<<<<<<< HEAD
          "id, contact_id, user_id, transferred_by, assigned_at, user_id_instagram, users!user_active_contacts_transferred_by_fkey(id, name), whatsapp_contacts!user_active_contacts_contact_id_fkey(name, phone)"
        )
        .eq("user_id", user.id)
        .eq("active", true)
        .or("transferred_by.not.is.null,user_id_instagram.not.is.null")
=======
          "id, contact_id, user_id, transferred_by, assigned_at, users!user_active_contacts_transferred_by_fkey(id, name), whatsapp_contacts!user_active_contacts_contact_id_fkey(name, phone)"
        )
        .eq("user_id", user.id)
        .eq("active", true)
        .not("transferred_by", "is", null)
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
        .order("assigned_at", { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as AssignmentRow[];
      const requestedContactIds = Array.from(
        new Set(
          rows
            .map((row) => (typeof row.contact_id === "string" ? row.contact_id : ""))
            .filter(Boolean)
        )
      );

      const requestEventByContact = new Map<string, { createdAt: number; isRequest: boolean }>();

      if (requestedContactIds.length > 0) {
        const { data: eventRows } = await supabase
          .from("whatsapp_messages")
          .select("contact_id, content, created_at")
          .in("contact_id", requestedContactIds)
          .order("created_at", { ascending: false })
          .limit(5000);

        (eventRows ?? []).forEach((eventRow) => {
          const contactId = typeof eventRow.contact_id === "string" ? eventRow.contact_id : "";
          const content = typeof eventRow.content === "string" ? eventRow.content.toLowerCase() : "";
          const createdAtValue =
            typeof eventRow.created_at === "string" ? Date.parse(eventRow.created_at) : Number.NaN;

          if (!contactId || !Number.isFinite(createdAtValue)) {
            return;
          }

          const isRelevantEvent =
            content.includes("solicitou transferência da conversa") ||
            content.includes("aprovou a solicitação de transferência") ||
            content.includes("transferiu a conversa para") ||
            content.includes("recusou a solicitação de transferência");

          if (!isRelevantEvent) {
            return;
          }

          if (requestEventByContact.has(contactId)) {
            return;
          }

          requestEventByContact.set(contactId, {
            createdAt: createdAtValue,
            isRequest: content.includes("solicitou transferência da conversa"),
          });
        });
      }

      const mappedNotifications = rows
        .map((row, index) => {
<<<<<<< HEAD
          const hasInstagramId = typeof row.user_id_instagram === "string" && row.user_id_instagram.trim() !== "";
          const contactId = typeof row.contact_id === "string" ? row.contact_id : "";
          
          if (!contactId && !hasInstagramId) return null;
=======
          const contactId = typeof row.contact_id === "string" ? row.contact_id : "";
          if (!contactId) return null;
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218

          const rawAssignedAt =
            typeof row.assigned_at === "string" && row.assigned_at.trim() !== ""
              ? row.assigned_at
              : null;

          const fallbackId =
<<<<<<< HEAD
            typeof row.id === "string" && row.id.trim() !== "" ? row.id : `${contactId || row.user_id_instagram}-${index}`;
          const readKey = `${fallbackId}:${rawAssignedAt ?? "-"}`;
          const latestEvent = requestEventByContact.get(contactId);
          const latestEventType = latestEvent?.isRequest ? "request" : "transfer";

          const type: "transfer" | "request" | "instagram-help" = hasInstagramId ? "instagram-help" : latestEventType;
=======
            typeof row.id === "string" && row.id.trim() !== "" ? row.id : `${contactId}-${index}`;
          const readKey = `${fallbackId}:${rawAssignedAt ?? "-"}`;
          const latestEvent = requestEventByContact.get(contactId);
          const type: "transfer" | "request" = latestEvent?.isRequest ? "request" : "transfer";
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218

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
<<<<<<< HEAD
            contactId: contactId || "",
            contactName: hasInstagramId ? `Instagram: ${row.user_id_instagram}` : (
              typeof row.whatsapp_contacts?.name === "string" &&
              row.whatsapp_contacts.name.trim() !== ""
                ? row.whatsapp_contacts.name.trim()
                : "Contato sem nome"
            ),
=======
            contactId,
            contactName:
              typeof row.whatsapp_contacts?.name === "string" &&
              row.whatsapp_contacts.name.trim() !== ""
                ? row.whatsapp_contacts.name.trim()
                : "Contato sem nome",
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
            transferredByName:
              typeof row.users?.name === "string" && row.users.name.trim() !== ""
                ? row.users.name.trim()
                : "Usuário",
            transferredById,
            ownerUserId,
            contactPhone,
            stage: "-",
            type,
            transferredAt: rawAssignedAt,
            readKey,
<<<<<<< HEAD
            userIdInstagram: hasInstagramId ? row.user_id_instagram : null,
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
          } as TransferNotification;
        })
        .filter((row): row is TransferNotification => row !== null);

<<<<<<< HEAD
      const contactIds = mappedNotifications
        .map((notification) => notification.contactId)
        .filter((id): id is string => typeof id === "string" && id !== "");
=======
      const contactIds = mappedNotifications.map((notification) => notification.contactId);
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
      if (contactIds.length > 0) {
        const { data: sessionRows } = await supabase
          .from("whatsapp_sessions")
          .select("contact_id, stage")
          .in("contact_id", contactIds)
          .limit(5000);

        const stageByContactId = new Map<string, string>();
        (sessionRows ?? []).forEach((row) => {
          const rowContactId = typeof row.contact_id === "string" ? row.contact_id : "";
          const rowStage = typeof row.stage === "string" ? row.stage : "-";
          if (rowContactId && !stageByContactId.has(rowContactId)) {
            stageByContactId.set(rowContactId, rowStage);
          }
        });

        mappedNotifications.forEach((notification) => {
          notification.stage = stageByContactId.get(notification.contactId) ?? "-";
        });
      }

      const filteredNotifications = mappedNotifications.filter(
        (notification) => !dismissedNotificationKeys.has(notification.readKey)
      );

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error("Erro ao carregar notificações de transferência:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [dismissedNotificationKeys, user?.id]);

  useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const loadChatCounts = useCallback(async () => {
    if (!user?.id) return;

    const supabase = createBrowserSupabase();

    try {
<<<<<<< HEAD
      const [myChatsData, botChatsData, allChatsData, contactsResponse, instagramResponse] = await Promise.all([
        getMessagesData({ userId: user.id, supabase }),
        getBotChatsData(supabase),
        getAllChatsData(supabase),
        fetch("/api/contacts", { cache: "no-store" }),
        fetch("/api/instagram/count", { cache: "no-store" }),
      ]);

      const contactsPayload = contactsResponse.ok
        ? ((await contactsResponse.json()) as { contacts?: unknown[] })
        : undefined;
      const contactsCount = Array.isArray(contactsPayload?.contacts) ? contactsPayload.contacts.length : 0;

      const instagramPayload = instagramResponse.ok
        ? ((await instagramResponse.json()) as { count?: number })
        : undefined;
      const instagramHumanCount = typeof instagramPayload?.count === "number" ? instagramPayload.count : 0;

=======
      const [myChatsData, botChatsData, allChatsData] = await Promise.all([
        getMessagesData({ userId: user.id, supabase }),
        getBotChatsData(supabase),
        getAllChatsData(supabase),
      ]);

>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
      setChatCounts({
        myChats: myChatsData.contacts.length,
        botChats: botChatsData.length,
        allChats: allChatsData.length,
<<<<<<< HEAD
        contacts: contactsCount,
        instagramHuman: instagramHumanCount,
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
      });
    } catch {
      // no-op
    }
  }, [user?.id]);

  useEffect(() => {
    void loadChatCounts();

    const intervalId = window.setInterval(() => {
      void loadChatCounts();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadChatCounts]);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createBrowserSupabase();

    const scheduleRealtimeRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        void Promise.all([loadNotifications(), loadChatCounts()]);
      }, 250);
    };

    const channel = supabase
      .channel(`sidebar-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
        },
        scheduleRealtimeRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_active_contacts",
        },
        scheduleRealtimeRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_sessions",
        },
        scheduleRealtimeRefresh
      )
<<<<<<< HEAD
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "instagram_conversations",
        },
        scheduleRealtimeRefresh
      )
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [loadChatCounts, loadNotifications, user?.id]);

  const getMenuItemCount = (countKey: SidebarCountKey | null) => {
    if (!countKey) return null;
    return chatCounts[countKey];
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/session/logout", { method: "POST" });
      localStorage.removeItem("user");
      toast.success("Desconectado com sucesso!");
      router.push("/authentication");
    } catch (error) {
      console.error("Erro ao desconectar:", error);
      toast.error("Erro ao desconectar");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleClickNotification = (notification: TransferNotification) => {
    if (!user?.id) return;

    const updatedReadKeys = new Set(readNotificationKeys);
    updatedReadKeys.add(notification.readKey);
    setReadNotificationKeys(updatedReadKeys);
    saveReadNotifications(user.id, updatedReadKeys);

    setNotificationsOpen(false);
<<<<<<< HEAD
    if (notification.type === "instagram-help") {
      router.push(`/instagram?userId=${notification.userIdInstagram}`);
    } else {
      router.push(`/chats-all/${notification.contactId}`);
    }
=======
    router.push(`/chats-all/${notification.contactId}`);
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
  };

  const handleApproveRequest = async (notification: TransferNotification) => {
    if (!user?.id || notification.type !== "request") return;
    if (!notification.transferredById) {
      toast.error("Solicitação inválida: usuário solicitante não identificado.");
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

      toast.success("Solicitação aprovada e conversa transferida.");
      await Promise.all([loadNotifications(), loadChatCounts()]);
    } catch (error) {
      if (error instanceof ChatActionError) {
        toast.error(error.message);
        return;
      }

      toast.error("Erro ao aprovar solicitação.");
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

      toast.success("Solicitação recusada.");
      await Promise.all([loadNotifications(), loadChatCounts()]);
    } catch (error) {
      if (error instanceof ChatActionError) {
        toast.error(error.message);
        return;
      }

      toast.error("Erro ao recusar solicitação.");
    } finally {
      setProcessingRequestKey(null);
    }
  };

  const handleDeleteNotification = (notification: TransferNotification) => {
    if (!user?.id) return;

    const updatedDismissedKeys = new Set(dismissedNotificationKeys);
    updatedDismissedKeys.add(notification.readKey);
    setDismissedNotificationKeys(updatedDismissedKeys);
    saveDismissedNotifications(user.id, updatedDismissedKeys);

    setNotifications((previous) =>
      previous.filter((item) => item.readKey !== notification.readKey)
    );
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  return (
    <>
      <Sidebar>
      <SidebarHeader className="border-b px-8 py-5 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Koala Parts" width={40} height={40} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setNotificationsOpen(true)}
          aria-label="Notificações de transferência"
          aria-haspopup="dialog"
          aria-expanded={notificationsOpen}
        >
          {hasPendingNotifications ? <BellDot /> : <Bell />}
          {pendingNotifications.length > 0 ? (
            <Badge className="absolute -right-1 -top-1 min-w-5 px-1 text-[10px]">
              {formatCount(pendingNotifications.length)}
            </Badge>
          ) : null}
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
<<<<<<< HEAD
          <SidebarGroupLabel>WhatsApp</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item, index) => (
                <Fragment key={item.title}>
                  {item.isDivider && index > 0 && (
                    <SidebarMenuItem className="my-1">
                      <Separator />
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isItemActive(item.url)}>
                      <Link href={item.url} aria-current={isItemActive(item.url) ? "page" : undefined}>
                        <item.icon />
                        <div className="flex w-full items-center justify-between gap-2">
                          <span>{item.title}</span>
                          {item.countKey ? (
                            <span className="text-xs font-semibold tabular-nums">
                              {formatCount(getMenuItemCount(item.countKey as SidebarCountKey | null) ?? 0)}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Fragment>
=======
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isItemActive(item.url)}>
                    <Link href={item.url} aria-current={isItemActive(item.url) ? "page" : undefined}>
                      <item.icon />
                      <div className="flex w-full items-center justify-between gap-2">
                        <span>{item.title}</span>
                        {item.countKey ? (
                          <span className="text-xs font-semibold tabular-nums">
                            {formatCount(getMenuItemCount(item.countKey as SidebarCountKey | null) ?? 0)}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent className="border-t pt-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between"
                    onClick={() => setTemplatesOpen(true)}
                    aria-label="Configurações de modelos de mensagem"
                  >
                    <span>Configurações</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isItemActive("/help")}
                >
                  <Link
                    href="/help"
                    aria-label="Ajuda"
                    aria-current={isItemActive("/help") ? "page" : undefined}
                    className="flex w-full items-center justify-between"
                  >
                    <CircleHelp />
                    <span>Ajuda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between"
                    onClick={handleToggleTheme}
                    aria-label={`Alternar para tema ${theme === "dark" ? "claro" : "escuro"}`}
                    aria-pressed={theme === "dark"}
                  >
                    <span>{theme === "dark" ? "Tema escuro" : "Tema claro"}</span>
                    <span
                      className={cn(
                        "relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border transition-colors",
                        theme === "dark"
                          ? "bg-primary border-primary"
                          : "bg-muted border-border"
                      )}
                      aria-hidden
                    >
                      <span
                        className={cn(
                          "absolute left-1 inline-flex size-5 items-center justify-center rounded-full transition-all",
                          theme === "dark"
                            ? "translate-x-6 bg-primary-foreground text-primary"
                            : "translate-x-0 bg-background text-muted-foreground"
                        )}
                      >
                        {theme === "dark" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                      </span>
                    </span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 px-3 py-5 ">
        <SidebarMenu className="border-t pt-3">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar>
                    <AvatarFallback>
                      {user ? getInitials(user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold">
                      {user?.name || "Carregando..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.role || ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email || ""}
                    </p>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <SheetContent side="left" className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-5">
          <SheetTitle className="text-lg">Notificações</SheetTitle>
          <SheetDescription>
            {hasPendingNotifications
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
                const isRead = readNotificationKeys.has(notification.readKey);

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
                      <ContactAvatar
                        name={notification.contactName}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {notification.contactName}
                        </p>
                        <p className="text-muted-foreground truncate text-xs leading-tight">
                          {notification.type === "request"
                            ? `${notification.transferredByName} solicitou a transferência`
<<<<<<< HEAD
                            : notification.type === "instagram-help"
                            ? "Usuário do Instagram precisa de ajuda"
=======
>>>>>>> 350972b9f3027278e71bfe910b7388217e565218
                            : `Transferido por ${notification.transferredByName}`}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatDatePtBr(notification.transferredAt, { preset: "full" })}
                        </p>
                      </div>
                      {!isRead && (
                        <Badge variant="default" className="ml-2 shrink-0">
                          Novo
                        </Badge>
                      )}
                    </button>

                    {notification.type === "request" ? (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleApproveRequest(notification);
                          }}
                          disabled={processingRequestKey === notification.readKey}
                        >
                          Aprovar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRejectRequest(notification);
                          }}
                          disabled={processingRequestKey === notification.readKey}
                        >
                          Recusar
                        </Button>
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-7 w-7 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteNotification(notification);
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

        {hasPendingNotifications && (
          <div className="border-t px-4 py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (!user?.id) return;
                const allReadKeys = new Set(readNotificationKeys);
                notifications.forEach((notification) => {
                  allReadKeys.add(notification.readKey);
                });
                setReadNotificationKeys(allReadKeys);
                saveReadNotifications(user.id, allReadKeys);
              }}
            >
              Marcar todas como lidas
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
    <MessageTemplatesSheet
      open={templatesOpen}
      onOpenChange={setTemplatesOpen}
      userId={user?.id ?? ""}
      mode="manage"
    />
    </>
  );
}