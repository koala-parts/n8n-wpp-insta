import { ChevronLeft, ChevronRight, Search, Instagram, Loader2, Image, MessageSquare, InstagramIcon } from "lucide-react";

import type { InstagramContact } from "@/data/instagram/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDatePtBr } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type InstagramContactListProps = {
  isSidebarCollapsed: boolean;
  search: string;
  contacts: InstagramContact[];
  activeContactId: string | null;
  onSearchChange: (value: string) => void;
  onToggleSidebar: () => void;
  onSelectContact: (contactId: string) => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  filterMyChats?: boolean;
  onFilterMyChatsChange?: (value: boolean) => void;
};

export function InstagramContactList({
  isSidebarCollapsed,
  search,
  contacts,
  activeContactId,
  onSearchChange,
  onToggleSidebar,
  onSelectContact,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  filterMyChats = false,
  onFilterMyChatsChange,
}: InstagramContactListProps) {
  let filteredContacts = contacts;

  if (filterMyChats) {
    filteredContacts = filteredContacts.filter((contact) => contact.isAssignedToCurrentUser);
  }

  if (search.trim()) {
    filteredContacts = filteredContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(search.toLowerCase()) ||
        contact.username.toLowerCase().includes(search.toLowerCase())
    );
  }

  return (
    <aside className="flex min-h-0 flex-col border-b md:border-r md:border-b-0">
      <div className="flex flex-col gap-2 border-b p-3 md:p-5">
        <div className="flex items-center justify-between">
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
        {!isSidebarCollapsed && onFilterMyChatsChange && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={filterMyChats}
              onChange={(e) => onFilterMyChatsChange(e.target.checked)}
              className="size-3.5 rounded border-input"
            />
            Minhas conversas
          </label>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => {
            const isActive = activeContactId === contact.contactId;
            const isHuman = !!contact.assignedUserId;

            return (
              <button
                key={contact.contactId}
                type="button"
                onClick={() => onSelectContact(contact.contactId)}
                className={cn(
                  "hover:bg-muted/60 flex w-full items-start border-b text-left transition-colors",
                  isSidebarCollapsed ? "justify-center p-3" : "gap-3 items-start p-4",
                  isActive && "bg-muted",
                  isHuman && "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary"
                )}
                title={isSidebarCollapsed ? contact.name : undefined}
              >
                {contact.profilePictureUrl ? (
                  <img
                    src={contact.profilePictureUrl}
                    alt={contact.name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 text-white shadow-md">
                    <Instagram className="h-5 w-5" />
                    {isHuman && (
                      <span className="absolute -right-1 -top-1 size-3 rounded-full bg-primary ring-2 ring-background" title="Humano" />
                    )}
                  </div>
                )}

                {!isSidebarCollapsed && (
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-sm", isHuman && "font-semibold")}>
                        {contact.name}
                      </p>
                      <div className="flex items-center gap-1">
                        {contact.assignedUserName && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {contact.assignedUserName}
                          </Badge>
                        )}
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {contact.lastMessageAt ? formatDatePtBr(contact.lastMessageAt) : ""}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground min-w-0 flex items-center gap-1 truncate text-xs">
                      {contact.lastMessagePreview === "Mídia" && (
                        <Image className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      )}
                      {contact.lastMessagePreview === "Menção a Story" && (
                        <InstagramIcon className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      )}
                      {contact.lastMessagePreview === "Resposta a Story" && (
                        <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      )}
                      <span className="truncate">
                        {contact.lastMessagePreview}
                      </span>
                    </p>
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

        {hasMore && !loadingMore && (
          <div className="flex justify-center p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              className="text-xs"
            >
              Carregar mais conversas
            </Button>
          </div>
        )}

        {loadingMore && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">
              Carregando...
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
