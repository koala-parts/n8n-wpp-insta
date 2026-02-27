import { createServerSupabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type GenericRow = Record<string, unknown>;

export type ChatMessage = {
	id: string;
	contactId: string;
	phone: string;
	direction: "inbound" | "outbound";
	senderType: string;
	senderName?: string;
	messageType: string;
	content: string | null;
	stage: string;
	createdAt: string | null;
};

export type ChatContact = {
	id: string;
	contactId: string;
	phone: string;
	name: string;
	photo: string | null;
	stage: string;
	assignedUserId?: string | null;
	assignedUserName?: string | null;
	transferRequestedById?: string | null;
	lastMessagePreview: string;
	lastMessageAt: string | null;
	totalMessages: number;
};

export type ChatsData = {
	contacts: ChatContact[];
	messagesByContact: Record<string, ChatMessage[]>;
};

type GetMessagesDataParams = {
	userId: string;
	supabase?: SupabaseClient;
};

const PHONE_KEYS = [
	"phone",
	"telefone",
	"phone_number",
	"phoneNumber",
	"whatsapp",
	"whatsapp_number",
	"wa_id",
	"number",
	"contact_phone",
];

const NAME_KEYS = [
	"name",
	"nome",
	"full_name",
	"fullName",
	"contact_name",
	"display_name",
	"first_name",
];

const TIMESTAMP_KEYS = [
	"created_at",
	"sent_at",
	"timestamp",
	"message_at",
	"updated_at",
];

function pickString(row: GenericRow, keys: string[]) {
	for (const key of keys) {
		const value = row[key];
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}
	return "";
}

function pickValue(row: GenericRow, keys: string[]) {
	for (const key of keys) {
		const value = row[key];
		if (value === null || value === undefined) {
			continue;
		}

		if (typeof value === "string") {
			const trimmed = value.trim();
			if (!trimmed) continue;
			return trimmed;
		}

		return value;
	}

	return null;
}

function toIsoDate(value: unknown) {
	if (value === null || value === undefined) {
		return null;
	}

	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return null;
		return value.toISOString();
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) return null;

		const normalized = Math.abs(value) < 1_000_000_000_000 ? value * 1000 : value;
		const parsed = new Date(normalized);
		if (Number.isNaN(parsed.getTime())) return null;
		return parsed.toISOString();
	}

	if (typeof value !== "string" || !value.trim()) {
		return null;
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed.toISOString();
}

function toTimestampMs(value: string | null) {
	if (!value) return null;

	const parsed = Date.parse(value);
	if (Number.isNaN(parsed)) {
		return null;
	}

	return parsed;
}

function normalizePhone(phone: string) {
	return phone.replace(/\D/g, "");
}

function compareByDateAsc(a: string | null, b: string | null) {
	const aTs = toTimestampMs(a);
	const bTs = toTimestampMs(b);

	if (aTs === null && bTs === null) return 0;
	if (aTs === null) return 1;
	if (bTs === null) return -1;

	return aTs - bTs;
}

function compareByDateDesc(a: string | null, b: string | null) {
	const aTs = toTimestampMs(a);
	const bTs = toTimestampMs(b);

	if (aTs === null && bTs === null) return 0;
	if (aTs === null) return 1;
	if (bTs === null) return -1;

	return bTs - aTs;
}

function isDuplicateBotEcho(message: ChatMessage, neighbor: ChatMessage | undefined) {
	if (!neighbor) return false;
	const messageSender = (message.senderType || "").trim().toLowerCase();
	const neighborSender = (neighbor.senderType || "").trim().toLowerCase();
	if (messageSender !== "bot" || neighborSender === "bot") return false;
	if (!message.content || !neighbor.content) return false;
	if (message.content.trim() !== neighbor.content.trim()) return false;

	const messageTs = toTimestampMs(message.createdAt);
	const neighborTs = toTimestampMs(neighbor.createdAt);
	if (messageTs === null || neighborTs === null) return false;

	return Math.abs(messageTs - neighborTs) <= 5000;
}

function inferDirection(value: string): "inbound" | "outbound" {
	return value === "outbound" ? "outbound" : "inbound";
}

function isTransferMessage(message: ChatMessage) {
	if (message.messageType === "system") return true;
	const content = message.content?.toLowerCase() ?? "";
	return (
		content.includes("transferiu para") ||
		content.includes("transferiu a conversa para") ||
		content.includes("finalizou a conversa") ||
		content.includes("solicitou transferência da conversa") ||
		content.includes("aprovou a solicitação de transferência") ||
		content.includes("recusou a solicitação de transferência")
	);
}

export default async function getMessagesData({
	userId,
	supabase,
}: GetMessagesDataParams): Promise<ChatsData> {
	const client = supabase ?? createServerSupabase();

	const { data: assignmentsData, error: assignmentsError } = await client
		.from("user_active_contacts")
		.select("contact_id")
		.eq("user_id", userId)
		.eq("active", true);

	if (assignmentsError) {
		throw new Error(`Erro ao buscar atribuições: ${assignmentsError.message}`);
	}

	const assignedContactIds = Array.from(
		new Set(
			(assignmentsData ?? [])
				.map((item) => {
					const value = (item as GenericRow).contact_id;
					return typeof value === "string" && value.trim() ? value : "";
				})
				.filter(Boolean)
		)
	);

	if (assignedContactIds.length === 0) {
		return {
			contacts: [],
			messagesByContact: {},
		};
	}

	const [
		{ data: messagesData, error: messagesError },
		{ data: contactsData },
		{ data: sessionsData },
	] =
		await Promise.all([
			client
				.from("whatsapp_messages")
				.select("*")
				.in("contact_id", assignedContactIds)
				.order("created_at", { ascending: true })
				.limit(5000),
			client.from("whatsapp_contacts").select("*").in("id", assignedContactIds),
			client
				.from("whatsapp_sessions")
				.select("*")
				.order("updated_at", { ascending: false })
				.limit(5000),
		]);

	if (messagesError) {
		throw new Error(`Erro ao buscar mensagens: ${messagesError.message}`);
	}

	const messageRows = (messagesData ?? []) as GenericRow[];
	const contactRows = (contactsData ?? []) as GenericRow[];
	const sessionRows = (sessionsData ?? []) as GenericRow[];

	const contactsById = new Map<string, GenericRow>();
	const contactsByPhone = new Map<string, GenericRow>();
	const stageByContact = new Map<string, string>();
	const sessionsByPhone = new Map<string, GenericRow>();

	for (const contact of contactRows) {
		const contactId = pickString(contact, ["id", "contact_id"]);
		const contactPhone = normalizePhone(pickString(contact, PHONE_KEYS));

		if (contactId) {
			contactsById.set(contactId, contact);
		}

		if (contactPhone) {
			contactsByPhone.set(contactPhone, contact);
		}
	}

	for (const sessionRow of sessionRows) {
		const sessionPhone = pickString(sessionRow, PHONE_KEYS);
		const normalizedSessionPhone = normalizePhone(sessionPhone);
		const stage = pickString(sessionRow, ["stage", "etapa"]);

		if (!normalizedSessionPhone || !stage || sessionsByPhone.has(normalizedSessionPhone)) {
			continue;
		}

		sessionsByPhone.set(normalizedSessionPhone, sessionRow);
	}

	for (const contactId of assignedContactIds) {
		const lastMessage = messageRows.find((m) => (m as GenericRow).contact_id === contactId);
		if (!lastMessage) continue;

		const contactPhone = normalizePhone(pickString(lastMessage as GenericRow, PHONE_KEYS));
		const sessionRow = sessionsByPhone.get(contactPhone);
		const stage = sessionRow ? pickString(sessionRow as GenericRow, ["stage", "etapa"]) : "";

		if (stage && !stageByContact.has(contactId)) {
			stageByContact.set(contactId, stage);
		}
	}

	const groupedMessages = new Map<string, ChatMessage[]>();
	const assignedIdsSet = new Set(assignedContactIds);

	for (let index = 0; index < messageRows.length; index += 1) {
		const row = messageRows[index];

		const phone = pickString(row, PHONE_KEYS);
		const contactId = pickString(row, ["contact_id", "contactId"]);

		if (!contactId || !assignedIdsSet.has(contactId)) {
			continue;
		}

		const idValue = row.id;
		const id =
			typeof idValue === "string" || typeof idValue === "number"
				? String(idValue)
				: `${contactId}-${index}`;

		const direction = inferDirection(pickString(row, ["direction"]));
		const rawSenderType = pickString(row, ["sender_type", "senderType"]);
		const senderType = rawSenderType;
		const explicitSenderName = pickString(row, ["sender_name", "senderName"]);
		const senderName =
			explicitSenderName ||
			(rawSenderType && rawSenderType !== "user"
				? rawSenderType
				: "") ||
			undefined;
		const messageType = pickString(row, ["message_type", "messageType"]) || "text";
		const stage = pickString(row, ["stage", "etapa"]) || "-";

		const contentValue = row.content;
		const content = typeof contentValue === "string" && contentValue.trim() ? contentValue : null;

		const createdAt = toIsoDate(pickValue(row, TIMESTAMP_KEYS));

		const message: ChatMessage = {
			id,
			contactId,
			phone,
			direction,
			senderType,
			senderName,
			messageType,
			content,
			stage,
			createdAt,
		};

		const existing = groupedMessages.get(contactId) ?? [];
		existing.push(message);
		groupedMessages.set(contactId, existing);
	}

	const messagesByContact: Record<string, ChatMessage[]> = {};
	const contacts: ChatContact[] = [];

	for (const contactId of assignedContactIds) {
		const messages = groupedMessages.get(contactId) ?? [];

		const filteredMessages = messages.filter((message, index, list) => {
			if ((message.senderType || "").trim().toLowerCase() !== "bot") {
				return true;
			}

			const previous = list[index - 1];
			const next = list[index + 1];
			return !isDuplicateBotEcho(message, previous) && !isDuplicateBotEcho(message, next);
		});

		messagesByContact[contactId] = filteredMessages;

		const lastMessage = filteredMessages[filteredMessages.length - 1] ?? null;
		const lastNonTransferMessage =
			[...filteredMessages].reverse().find((message) => !isTransferMessage(message)) ?? null;
		const normalizedPhone = normalizePhone(lastMessage?.phone ?? "");
		const contactRow =
			contactsById.get(contactId) ||
			(normalizedPhone ? contactsByPhone.get(normalizedPhone) : undefined);

		const phone = lastMessage?.phone || pickString(contactRow ?? {}, PHONE_KEYS) || "-";
		const fallbackName = normalizedPhone
			? `Contato ${normalizedPhone.slice(-4)}`
			: "Sem nome";

		const name = pickString(contactRow ?? {}, NAME_KEYS) || fallbackName;
		const photo = pickString(contactRow ?? {}, ["photo", "avatar", "profile_photo"]);

		const lastMessagePreview =
			lastNonTransferMessage?.content ||
			(lastNonTransferMessage?.messageType === "image"
				? "[imagem]"
				: "Sem mensagens ainda");

		contacts.push({
			id: contactId,
			contactId,
			phone,
			name,
			photo: photo || null,
			stage: stageByContact.get(contactId) || lastMessage?.stage || "-",
			lastMessagePreview,
			lastMessageAt: lastNonTransferMessage?.createdAt ?? null,
			totalMessages: filteredMessages.length,
		});
	}

	contacts.sort((a, b) => compareByDateDesc(a.lastMessageAt, b.lastMessageAt));

	return {
		contacts,
		messagesByContact,
	};
}
