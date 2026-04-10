import { createServerSupabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type GenericRow = Record<string, unknown>;

export type AllChatsConversation = {
	id: string;
	contactId: string;
	phone: string;
	name: string;
	photo: string | null;
	stage: string;
	assignedUserId: string | null;
	assignedUserName: string | null;
	isBot: boolean;
	lastMessagePreview: string;
	lastMessageAt: string | null;
	totalMessages: number;
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

function compareByDateDesc(a: string | null, b: string | null) {
	const aTs = toTimestampMs(a);
	const bTs = toTimestampMs(b);

	if (aTs === null && bTs === null) return 0;
	if (aTs === null) return 1;
	if (bTs === null) return -1;

	return bTs - aTs;
}

function isTransferMessage(content: string | null) {
	if (!content) return false;
	const normalizedContent = content.toLowerCase();
	return (
		normalizedContent.includes("transferiu para") ||
		normalizedContent.includes("transferiu a conversa para") ||
		normalizedContent.includes("finalizou a conversa") ||
		normalizedContent.includes("solicitou transferência da conversa") ||
		normalizedContent.includes("aprovou a solicitação de transferência") ||
		normalizedContent.includes("recusou a solicitação de transferência")
	);
}

export default async function getAllChatsData(supabase?: SupabaseClient) {
	const client = supabase ?? createServerSupabase();

	const [
		{ data: messagesData },
		{ data: contactsData },
		{ data: usersData },
		{ data: assignmentsData },
		{ data: sessionsData },
	] = await Promise.all([
		client
			.from("whatsapp_messages")
			.select("*")
			.order("created_at", { ascending: true })
			.limit(5000),
		client.from("whatsapp_contacts").select("*").limit(500),
		client.from("users").select("id, name").limit(500),
		client.from("user_active_contacts").select("*").eq("active", true).limit(5000),
		client.from("whatsapp_sessions").select("*").order("updated_at", { ascending: false }).limit(5000),
	]);

	const messageRows = (messagesData ?? []) as GenericRow[];
	const contactRows = (contactsData ?? []) as GenericRow[];
	const userRows = (usersData ?? []) as GenericRow[];
	const assignmentRows = (assignmentsData ?? []) as GenericRow[];
	const sessionRows = (sessionsData ?? []) as GenericRow[];

	const contactsById = new Map<string, GenericRow>();
	const contactsByPhone = new Map<string, GenericRow>();
	const usersById = new Map<string, string>();
	const assignmentByContact = new Map<string, string>();
	const sessionsByPhone = new Map<string, GenericRow>();
	const stageByContact = new Map<string, string>();

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

	for (const user of userRows) {
		const userId = pickString(user, ["id"]);
		const userName = pickString(user, ["name"]);
		if (userId) {
			usersById.set(userId, userName);
		}
	}

	for (const assignment of assignmentRows) {
		const contactId = pickString(assignment, ["contact_id"]);
		const userId = pickString(assignment, ["user_id"]);
		if (contactId && userId && !assignmentByContact.has(contactId)) {
			assignmentByContact.set(contactId, userId);
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

	const groupedMessages = new Map<string, GenericRow[]>();

	for (const row of messageRows) {
		const contactId = pickString(row, ["contact_id", "contactId"]);
		if (!contactId) continue;

		const existing = groupedMessages.get(contactId) ?? [];
		existing.push(row);
		groupedMessages.set(contactId, existing);
	}

	for (const [contactId, messages] of groupedMessages.entries()) {
		const lastMessage = messages[0];
		if (!lastMessage) continue;

		const contactPhone = normalizePhone(pickString(lastMessage, PHONE_KEYS));
		const sessionRow = sessionsByPhone.get(contactPhone);
		const stage = sessionRow ? pickString(sessionRow, ["stage", "etapa"]) : "";

		if (stage && !stageByContact.has(contactId)) {
			stageByContact.set(contactId, stage);
		}
	}

	const conversations: AllChatsConversation[] = [];

	for (const [contactId, messages] of groupedMessages.entries()) {
		const lastMessage = messages[0];
		if (!lastMessage) continue;

		const phone = pickString(lastMessage, PHONE_KEYS);
		const normalizedPhone = normalizePhone(phone);
		const contactRow = contactsById.get(contactId) || contactsByPhone.get(normalizedPhone);

		const fallbackName = normalizedPhone ? `Contato ${normalizedPhone.slice(-4)}` : "Sem nome";
		const name = pickString(contactRow ?? {}, NAME_KEYS) || fallbackName;
		const photo = pickString(contactRow ?? {}, ["photo", "avatar", "profile_photo"]);

		const lastNonTransferMessage = messages.find(
			(m) => !isTransferMessage(pickString(m, ["content"]))
		);

		const lastMessagePreview = lastNonTransferMessage
			? pickString(lastNonTransferMessage, ["content"]) ||
				(pickString(lastNonTransferMessage, ["message_type", "messageType"]) === "image"
					? "[imagem]"
					: "Sem conteúdo")
			: "Sem mensagens ainda";

		const lastMessageAt = lastNonTransferMessage
			? toIsoDate(pickValue(lastNonTransferMessage, TIMESTAMP_KEYS))
			: null;

		const assignedUserId = assignmentByContact.get(contactId) ?? null;
		const assignedUserName = assignedUserId ? usersById.get(assignedUserId) ?? null : null;
		const isBot = assignedUserId === null;

		const stage = stageByContact.get(contactId) || pickString(lastMessage, ["stage", "etapa"]) || "-";

		conversations.push({
			id: contactId,
			contactId,
			phone,
			name,
			photo: photo || null,
			stage,
			assignedUserId,
			assignedUserName,
			isBot,
			lastMessagePreview,
			lastMessageAt,
			totalMessages: messages.length,
		});
	}

	conversations.sort((a, b) => compareByDateDesc(a.lastMessageAt, b.lastMessageAt));

	return conversations;
}
