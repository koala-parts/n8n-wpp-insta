import type { ChatContact } from "@/data/get-messages";

type ChatsConversationHeaderProps = {
  activeContact: ChatContact;
};

export function ChatsConversationHeader({
  activeContact,
}: ChatsConversationHeaderProps) {
  return (
    <header className="border-b px-7 py-7 md:px-8 md:py-8">
      <div>
        <p className="font-medium">{activeContact.name}</p>
        <p className="text-muted-foreground text-xs">{activeContact.phone}</p>
      </div>
    </header>
  );
}
