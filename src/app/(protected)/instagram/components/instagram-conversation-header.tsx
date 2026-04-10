"use client";

import { Instagram } from "lucide-react";

import type { InstagramContact } from "@/data/instagram/types";

type InstagramConversationHeaderProps = {
  activeContact: InstagramContact;
};

export function InstagramConversationHeader({
  activeContact,
}: InstagramConversationHeaderProps) {
  return (
    <header className="border-b px-5 py-4 md:px-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 text-white shadow-md">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{activeContact.name}</p>
            <p className="text-muted-foreground text-xs">{activeContact.phone}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
