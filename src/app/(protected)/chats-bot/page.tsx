"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactAvatar } from "@/components/contact-avatar";
import Link from "next/link";
import { toast } from "sonner";
import getBotChatsData from "@/data/get-bot-chats";
import { formatDatePtBr } from "@/lib/formatters";
import { getStageLabel } from "../chats/components/chats-view.helpers";

type BotChat = Awaited<ReturnType<typeof getBotChatsData>>[number];

type CurrentUser = {
  id: string;
  name: string;
};

export default function BotChatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<BotChat[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [assumingContactId, setAssumingContactId] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadChats = useCallback(async () => {
    try {
      const userRaw = localStorage.getItem("user");
      if (!userRaw) {
        setChats([]);
        return;
      }

      const currentUser = JSON.parse(userRaw) as CurrentUser;
      setUser(currentUser);

      const botChats = await getBotChatsData();
      setChats(botChats);
    } catch {
      toast.error("Erro ao carregar chats do bot.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const scheduleReload = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      void loadChats();
    }, 300);
  }, [loadChats]);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    const channel = supabase
      .channel("bot-chats-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
        },
        () => {
          scheduleReload();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_active_contacts",
        },
        () => {
          scheduleReload();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_sessions",
        },
        () => {
          scheduleReload();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [scheduleReload]);

  const handleAssumeChat = async (contactId: string) => {
    if (!user) {
      toast.error("Usuário não identificado.");
      return;
    }

    const confirmed = window.confirm("Deseja assumir esta conversa?");
    if (!confirmed) return;

    try {
      setAssumingContactId(contactId);
      const supabase = createBrowserSupabase();

      // Encontrar o contato para pegar o telefone
      const contact = chats.find((chat) => chat.contactId === contactId);
      if (!contact) {
        toast.error("Contato não encontrado.");
        return;
      }

      // Atualizar user_active_contacts
      const { data: existingAssignment, error: selectError } = await supabase
        .from("user_active_contacts")
        .select("id")
        .eq("contact_id", contactId)
        .eq("active", true)
        .limit(1);

      if (selectError) {
        toast.error("Erro ao verificar atribuição.");
        return;
      }

      if (existingAssignment && existingAssignment.length > 0) {
        const { error: updateError } = await supabase
          .from("user_active_contacts")
          .update({ user_id: user.id })
          .eq("contact_id", contactId)
          .eq("active", true);

        if (updateError) {
          toast.error("Erro ao atualizar atribuição.");
          return;
        }
      } else {
        const { error: insertError } = await supabase.from("user_active_contacts").insert({
          user_id: user.id,
          contact_id: contactId,
          active: true,
        });

        if (insertError) {
          toast.error("Erro ao assumir conversa.");
          return;
        }
      }

      // Atualizar whatsapp_sessions stage para "humano"
      const { error: sessionUpdateError } = await supabase
        .from("whatsapp_sessions")
        .update({ stage: "humano" })
        .eq("phone", contact.phone);

      if (sessionUpdateError) {
        console.error("Erro ao atualizar stage:", sessionUpdateError);
        // Não retorna aqui, pois a atribuição já foi feita com sucesso
      }

      toast.success("Conversa assumida com sucesso!");
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/chats");
    } finally {
      setAssumingContactId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Chats do Bot</PageTitle>
          <PageDescription>
            Conversas que ainda estão sendo atendidas pelo bot. Clique em &quot;Assumir Conversa&quot; para
            adicionar à sua fila.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>

      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Conversas Disponíveis</CardTitle>
            <CardDescription>{chats.length} conversa(s) do bot</CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : chats.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                Nenhuma conversa do bot disponível.
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => (
                  <div
                    key={chat.contactId}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted transition-colors"
                  >
                    <Link href={`/chats-bot/${chat.contactId}`} className="flex-1">
                      <div className="flex items-center gap-4 cursor-pointer">
                        <ContactAvatar name={chat.name} photo={chat.photo} />

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{chat.name}</p>
                            <Badge variant="outline">{getStageLabel(chat.stage)}</Badge>
                          </div>
                          <p className="text-muted-foreground truncate text-xs">{chat.phone}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {chat.lastMessagePreview}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDatePtBr(chat.lastMessageAt)}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <Button
                      size="sm"
                      onClick={() => handleAssumeChat(chat.contactId)}
                      disabled={assumingContactId === chat.contactId}
                      className="ml-4"
                    >
                      {assumingContactId === chat.contactId ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Assumindo...
                        </>
                      ) : (
                        "Assumir Conversa"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </PageContainer>
  );
}
