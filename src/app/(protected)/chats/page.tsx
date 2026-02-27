"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    PageContainer,
    PageContent,
    PageDescription,
    PageHeader,
    PageHeaderContent,
    PageTitle,
} from "@/components/ui/page-container";
import { createBrowserSupabase } from "@/lib/supabase";
import getMessagesData from "@/data/get-messages";
import { toast } from "sonner";

import ChatsView from "./components/chats-view";

export const dynamic = "force-dynamic";

type CurrentUser = {
    id: string;
};

const ChatsPage = () => {
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<Awaited<ReturnType<typeof getMessagesData>>["contacts"]>([]);
    const [messagesByContact, setMessagesByContact] = useState<
        Awaited<ReturnType<typeof getMessagesData>>["messagesByContact"]
    >({});
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadChats = useCallback(async () => {
        try {
            const userRaw = localStorage.getItem("user");

            if (!userRaw) {
                setContacts([]);
                setMessagesByContact({});
                return;
            }

            const currentUser = JSON.parse(userRaw) as CurrentUser;
            if (!currentUser.id) {
                setContacts([]);
                setMessagesByContact({});
                return;
            }

            const supabase = createBrowserSupabase();
            const result = await getMessagesData({
                userId: currentUser.id,
                supabase,
            });

            setContacts(result.contacts);
            setMessagesByContact(result.messagesByContact);
        } catch {
            toast.error("Erro ao carregar chats atribuídos.");
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
            loadChats();
        }, 300);
    }, [loadChats]);

    useEffect(() => {
        const userRaw = localStorage.getItem("user");
        if (!userRaw) return;

        const currentUser = JSON.parse(userRaw) as CurrentUser;
        if (!currentUser.id) return;

        const supabase = createBrowserSupabase();

        const channel = supabase
            .channel(`chats-realtime-${currentUser.id}`)
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

    return (
        <PageContainer>

            <PageContent>
                <ChatsView
                    contacts={contacts}
                    messagesByContact={messagesByContact}
                    loading={loading}
                    onTransferred={loadChats}
                />
            </PageContent>
        </PageContainer>
    );
};

export default ChatsPage;