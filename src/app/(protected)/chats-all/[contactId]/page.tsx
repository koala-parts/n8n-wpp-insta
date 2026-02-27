"use client";

import { useParams } from "next/navigation";
import { ChatDetailView } from "@/app/(protected)/chats/components/chat-detail-view";

export default function AllChatDetailPage() {
	const params = useParams();
	const contactId = params.contactId as string;

	return (
		<ChatDetailView
			contactId={contactId}
			backHref="/chats-all"
			backLabel="Voltar para Todas as Conversas"
			title="Todas as Conversas"
			description="Visualização completa da conversa selecionada."
			viewMode="all"
		/>
	);
}
