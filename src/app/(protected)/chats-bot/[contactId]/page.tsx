"use client";

import { useParams } from "next/navigation";
import { ChatDetailView } from "@/app/(protected)/chats/components/chat-detail-view";

export default function BotChatDetailPage() {
	const params = useParams();
	const contactId = params.contactId as string;

	return (
		<ChatDetailView
			contactId={contactId}
			backHref="/chats-bot"
			backLabel="Voltar para Chats do Bot"
			title="Chats do Bot"
			description="Conversa do bot aberta para acompanhamento."
			viewMode="bot"
		/>
	);
}
