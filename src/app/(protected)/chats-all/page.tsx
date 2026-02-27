"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import getAllChatsData from "@/data/get-all-chats";
import type { AllChatsConversation } from "@/data/get-all-chats";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "@/components/contact-avatar";
import { Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getStageLabel, isFinalizedStage } from "../chats/components/chats-view.helpers";
import { createBrowserSupabase } from "@/lib/supabase";

export default function AllChatsPage() {
	const [chats, setChats] = useState<AllChatsConversation[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const loadChats = useCallback(async () => {
		setLoading(true);
		const data = await getAllChatsData();
		setChats(data);
		setLoading(false);
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
			.channel("all-chats-realtime")
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

	const filteredChats = chats.filter((chat) =>
		[chat.name, chat.phone, chat.assignedUserName]
			.join(" ")
			.toLowerCase()
			.includes(search.toLowerCase())
	);

	const truncateText = (text: string, maxLength: number = 50) => {
		if (text.length > maxLength) {
			return text.slice(0, maxLength) + "...";
		}
		return text;
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-6 h-full">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Todas as Conversas</h1>
					<p className="text-muted-foreground mt-2">
						Visualize todos os contatos e veja quem está conversando com cada um
					</p>
				</div>

				<div className="flex flex-col gap-4">
					<div className="flex gap-2">
						<Input
							placeholder="Buscar por nome, telefone ou usuário atribuído..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<Button onClick={loadChats} disabled={loading} variant="outline">
							{loading ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								"Atualizar"
							)}
						</Button>
					</div>

					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-4">
							{filteredChats.length === 0 ? (
								<div className="md:col-span-2 lg:col-span-3 text-center py-12">
									<MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
									<p className="text-muted-foreground text-sm">
										{search
											? "Nenhuma conversa encontrada"
											: "Nenhuma conversa disponível"}
									</p>
								</div>
							) : (
								filteredChats.map((chat) => {
									const finalized = isFinalizedStage(chat.stage);

									return (
								<Link key={chat.id} href={`/chats-all/${chat.contactId}`}>
										<Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
											<CardHeader className="pb-3">
												<div className="flex items-start justify-between gap-2">
													<div className="flex items-center gap-3 flex-1">
														<ContactAvatar
															name={chat.name}
															photo={chat.photo}
															className="h-10 w-10"
														/>
														<div className="flex-1 min-w-0">
															<h3 className="font-semibold text-sm truncate">
																{chat.name}
															</h3>
															<p className="text-xs text-muted-foreground">
																{chat.phone}
															</p>
														</div>
													</div>
												</div>
											</CardHeader>

											<CardContent className="space-y-3">
												<div className="flex flex-wrap gap-2">
													<Badge variant={finalized ? "default" : "outline"} className="text-xs">
														{finalized ? "✓ Finalizado" : getStageLabel(chat.stage)}
													</Badge>

													{!finalized ? (
														chat.isBot ? (
															<Badge className="bg-blue-100 text-blue-800 text-xs">
																🤖 Bot
															</Badge>
														) : (
															<Badge className="bg-green-100 text-green-800 text-xs">
																👤 {chat.assignedUserName || "Desconhecido"}
															</Badge>
														)
													) : null}
												</div>

												<div>
													<p className="text-xs text-muted-foreground mb-1">
														Última mensagem:
													</p>
													<p className="text-sm">
														{truncateText(chat.lastMessagePreview)}
													</p>
													{chat.lastMessageAt && (
														<p className="text-xs text-muted-foreground mt-2">
															{new Date(chat.lastMessageAt).toLocaleDateString(
																"pt-BR"
															)}{" "}
															às{" "}
															{new Date(chat.lastMessageAt).toLocaleTimeString(
																"pt-BR"
															)}
														</p>
													)}
												</div>

												<div className="pt-2 border-t">
													<p className="text-xs text-muted-foreground">
														{chat.totalMessages}{" "}
														{chat.totalMessages === 1
															? "mensagem"
															: "mensagens"}
													</p>
												</div>
											</CardContent>
										</Card>
									</Link>
									);
								})
							)}
						</div>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
