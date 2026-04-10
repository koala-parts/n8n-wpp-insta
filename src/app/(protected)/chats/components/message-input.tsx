"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Send, Sparkles, StickyNote, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AISuggestionsDialog } from "./ai-suggestions-dialog";
import { AiPromptDialog } from "./ai-prompt-dialog";
import { ChatNotesDialog } from "./chat-notes-dialog";
import { MessageTemplatesSheet } from "./message-templates-sheet";

function getStoredUser() {
	try {
		const userRaw = localStorage.getItem("user");
		if (!userRaw) return null;
		const parsed = JSON.parse(userRaw) as { id?: string; name?: string };
		return {
			id: typeof parsed.id === "string" ? parsed.id.trim() : "",
			name: typeof parsed.name === "string" ? parsed.name.trim() : "",
		};
	} catch {
		return null;
	}
}

type MessageInputProps = {
	contactId: string;
	contactPhone: string;
	userName?: string;
	onMessageSent?: () => void;
	disabled?: boolean;
};

export function MessageInput({
	contactId,
	contactPhone,
	userName,
	onMessageSent,
	disabled,
}: MessageInputProps) {
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [generatingAI, setGeneratingAI] = useState(false);
	const [aiPromptOpen, setAiPromptOpen] = useState(false);
	const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
	const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
	const [notesOpen, setNotesOpen] = useState(false);
	const [templatesOpen, setTemplatesOpen] = useState(false);

	const storedUser = useMemo(() => getStoredUser(), []);

	const effectiveUserName =
		typeof userName === "string" && userName.trim()
			? userName.trim()
			: storedUser?.name ?? "";

	const handleSendMessage = async () => {
		if (!message.trim()) {
			toast.error("Digite uma mensagem antes de enviar.");
			return;
		}

		try {
			setSending(true);
			const normalizedSenderName =
				typeof userName === "string" && userName.trim()
					? userName.trim()
					: storedUser?.name ?? "";
			const senderId = storedUser?.id ?? "";

			const response = await fetch("/api/send-message", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contactId,
					phone: contactPhone,
					message: message.trim(),
					senderName: normalizedSenderName,
					senderId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error(data.error || "Erro ao enviar mensagem.");
				return;
			}

			toast.success("Mensagem enviada com sucesso!");
			setMessage("");
			onMessageSent?.();
		} catch (error) {
			console.error("Erro:", error);
			toast.error("Erro ao enviar mensagem.");
		} finally {
			setSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleGenerateWithAI = () => {
		setAiPromptOpen(true);
	};

	const handleAiPromptSubmit = async (prompt: string) => {
		try {
			setGeneratingAI(true);
			setAiSuggestions([]);

			const response = await fetch("/api/generate-message", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompt: prompt.trim(),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error(data.error || "Erro ao gerar sugestões.");
				setAiPromptOpen(false);
				return;
			}

			setAiSuggestions(data.suggestions || []);
			setAiPromptOpen(false);
			setAiSuggestionsOpen(true);
		} catch (error) {
			console.error("Erro ao gerar sugestões:", error);
			toast.error("Erro ao gerar sugestões.");
			setAiPromptOpen(false);
		} finally {
			setGeneratingAI(false);
		}
	};

	const handleSelectSuggestion = (suggestion: string) => {
		setMessage(suggestion);
	};

	const handleSelectTemplate = (templateContent: string) => {
		if (!templateContent) return;
		// Se já tiver texto digitado, concatena; senão, substitui.
		setMessage((previous) =>
			previous.trim()
				? `${previous.trim()} ${templateContent}`.trim()
				: templateContent
		);
	};

	return (
		<>
			<div className="border-t bg-background px-4 py-3">
				<div className="mb-2 flex items-center justify-between gap-2">
					<p className="text-muted-foreground text-xs">
						Pressione <span className="font-semibold">Enter</span> para enviar
					</p>
					<div className="text-muted-foreground flex items-center gap-1 text-xs">
						<Sparkles className="size-3.5" />
						Atalhos de IA e modelos
					</div>
				</div>
				<div className="flex gap-2">
				<Input
					placeholder="Digite sua mensagem..."
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={sending || disabled || generatingAI}
					className="flex-1"
				/>
				<Button
					onClick={() => setTemplatesOpen(true)}
					disabled={sending || disabled}
					size="icon"
					variant="outline"
					title="Modelos de mensagem"
					aria-label="Abrir modelos de mensagem"
				>
					<FileText className="w-4 h-4" />
				</Button>
				<Button
					onClick={() => setNotesOpen(true)}
					disabled={sending || disabled}
					size="icon"
					variant="outline"
					title="Anotações internas da conversa"
					aria-label="Abrir anotações da conversa"
				>
					<StickyNote className="w-4 h-4" />
				</Button>
				<Button
					onClick={handleGenerateWithAI}
					disabled={sending || disabled || generatingAI}
					size="icon"
					variant="outline"
					title="Gerar com IA"
					aria-label="Gerar mensagem com IA"
				>
					{generatingAI ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Wand2 className="w-4 h-4" />
					)}
				</Button>
				<Button
					onClick={handleSendMessage}
					disabled={sending || disabled || !message.trim()}
					size="sm"
					className="min-w-[96px]"
					aria-label="Enviar mensagem"
				>
					{sending ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" />
							Enviando...
						</>
					) : (
						<>
							<Send className="w-4 h-4" />
							Enviar
						</>
					)}
				</Button>
				</div>
			</div>

			<AISuggestionsDialog
				open={aiSuggestionsOpen}
				onOpenChange={setAiSuggestionsOpen}
				suggestions={aiSuggestions}
				loading={generatingAI}
				onSelectSuggestion={handleSelectSuggestion}
			/>

			<AiPromptDialog
				open={aiPromptOpen}
				onOpenChange={setAiPromptOpen}
				onSubmit={handleAiPromptSubmit}
				loading={generatingAI}
			/>

			<ChatNotesDialog
				contactId={contactId}
				open={notesOpen}
				onOpenChange={setNotesOpen}
				currentUserId={storedUser?.id ?? ""}
				currentUserName={effectiveUserName}
			/>

			<MessageTemplatesSheet
				open={templatesOpen}
				onOpenChange={setTemplatesOpen}
				userId={storedUser?.id ?? ""}
				mode="quick-insert"
				onSelectTemplate={handleSelectTemplate}
			/>
		</>
	);
}

