import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import type { ChatContact } from "@/data/get-messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactAvatar } from "@/components/contact-avatar";
import { formatDatePtBr } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { isFinalizedStage } from "./chats-view.helpers";

type ChatsContactListProps = {
  isSidebarCollapsed: boolean;
  search: string;
  filteredContacts: ChatContact[];
  activeContactId: string | null;
  stageOverrides: Record<string, string>;
  onSearchChange: (value: string) => void;
  onToggleSidebar: () => void;
  onSelectContact: (contactId: string) => void;
};

export function ChatsContactList({
  isSidebarCollapsed,
  search,
  filteredContacts,
  activeContactId,
  stageOverrides,
  onSearchChange,
  onToggleSidebar,
  onSelectContact,
}: ChatsContactListProps) {
  return (
    <aside className="flex min-h-0 flex-col border-b md:border-r md:border-b-0">
      <div className="flex items-center justify-between border-b p-3 md:p-5">
        {!isSidebarCollapsed && (
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar contato"
              className="pl-8"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-8 w-8 shrink-0"
          title={isSidebarCollapsed ? "Expandir lista" : "Collapse lista"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => {
            const isActive = activeContactId === contact.contactId;
            const contactStage = stageOverrides[contact.contactId] ?? contact.stage;
            const contactFinalized = isFinalizedStage(contactStage);

            return (
              <button
                key={contact.contactId}
                type="button"
                onClick={() => onSelectContact(contact.contactId)}
                className={cn(
                  "hover:bg-muted/60 flex w-full items-start border-b text-left transition-colors",
                  isSidebarCollapsed ? "justify-center p-3" : "gap-4 items-start p-5",
                  isActive && "bg-muted"
                )}
                title={isSidebarCollapsed ? contact.name : undefined}
              >
                <ContactAvatar
                  name={contact.name}
                  photo={contact.photo}
                  className={isSidebarCollapsed ? "h-10 w-10" : ""}
                />

                {!isSidebarCollapsed && (
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{contact.name}</p>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {formatDatePtBr(contact.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate text-xs">{contact.phone}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground min-w-0 truncate text-xs">
                        {contact.lastMessagePreview}
                      </p>
                      {contactFinalized ? (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Finalizado
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                )}
              </button>
            );
          })
        ) : (
          !isSidebarCollapsed && (
            <div className="text-muted-foreground p-6 text-sm">Nenhum contato encontrado.</div>
          )
        )}
      </div>
    </aside>
  );
}
