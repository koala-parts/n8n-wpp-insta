"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatContact } from "@/data/get-messages";
import { toast } from "sonner";

type ChatsConversationHeaderProps = {
  activeContact: ChatContact;
};

export function ChatsConversationHeader({
  activeContact,
}: ChatsConversationHeaderProps) {
  const normalizedPhone = useMemo(
    () => (activeContact.phone || "").replace(/\D/g, ""),
    [activeContact.phone]
  );

  const [isLead, setIsLead] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadLead = async () => {
      try {
        if (!normalizedPhone) return;
        setLoading(true);

        const response = await fetch(
          `/api/chat-lead?phone=${encodeURIComponent(normalizedPhone)}`
        );
        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || "Erro ao carregar status de lead.");
          return;
        }

        if (!isCancelled) setIsLead(Boolean(data.isLead));
      } catch (error) {
        console.error("Erro ao carregar status de lead:", error);
        if (!isCancelled) toast.error("Erro ao carregar status de lead.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    void loadLead();

    return () => {
      isCancelled = true;
    };
  }, [normalizedPhone]);

  const handleToggleLead = async (nextChecked: boolean) => {
    if (loading) return;
    if (!normalizedPhone) return;

    setLoading(true);

    // Otimista
    const previous = isLead;
    setIsLead(nextChecked);

    try {
      if (nextChecked) {
        const response = await fetch("/api/chat-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: normalizedPhone,
            contactId: activeContact.id,
            interest: null,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setIsLead(previous);
          toast.error(data.error || "Erro ao marcar como lead.");
          return;
        }
      } else {
        const response = await fetch("/api/chat-lead", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone }),
        });

        const data = await response.json();
        if (!response.ok) {
          setIsLead(previous);
          toast.error(data.error || "Erro ao remover lead.");
          return;
        }
      }
    } catch (error) {
      console.error("Erro ao alternar lead:", error);
      setIsLead(previous);
      toast.error("Erro ao alternar lead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="border-b px-7 py-7 md:px-8 md:py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{activeContact.name}</p>
          <p className="text-muted-foreground text-xs">{activeContact.phone}</p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs">
          <input
            type="checkbox"
            checked={isLead}
            disabled={loading || !normalizedPhone}
            onChange={(e) => void handleToggleLead(e.target.checked)}
          />
          <span>Lead</span>
        </label>
      </div>
    </header>
  );
}
