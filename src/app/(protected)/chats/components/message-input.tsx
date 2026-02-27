"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AISuggestionsDialog } from "./ai-suggestions-dialog";
import { AiPromptDialog } from "./ai-prompt-dialog";

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

	const handleSendMessage = async () => {
		if (!message.trim()) {
			toast.error("Digite uma mensagem antes de enviar.");
			return;
		}

		try {
			setSending(true);
			const storedUser = getStoredUser();
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

	return (
		<>
			<div className="flex gap-2 p-4 border-t bg-background">
				<Input
					placeholder="Digite sua mensagem..."
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={sending || disabled || generatingAI}
					className="flex-1"
				/>
				<Button
					onClick={handleGenerateWithAI}
					disabled={sending || disabled || generatingAI}
					size="icon"
					variant="outline"
					title="Gerar com IA"
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
					size="icon"
				>
					{sending ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Send className="w-4 h-4" />
					)}
				</Button>
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
		</>
	);
}

