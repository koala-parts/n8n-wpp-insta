import { createServerSupabase } from "@/lib/supabase";

type GenericRow = Record<string, unknown>;

export type DashboardConversationRow = {
  id: string;
  phone: string;
  name: string;
  stage: string;
  status: "bot" | "humano";
  lead: "S" | "N";
  lastInteraction: string | null;
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

const LAST_INTERACTION_KEYS = [
  "last_interaction",
  "last_interaction_at",
  "last_message_at",
  "last_activity_at",
  "updated_at",
  "created_at",
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

function pickBoolean(row: GenericRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return null;
}

function toDateString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export default async function getDashboardData() {
  const supabase = createServerSupabase();

  // Total Contatos
  const { count: totalContacts } = await supabase
    .from("whatsapp_contacts")
    .select("*", { count: "exact", head: true });

  // Atendimento Humano ativo
  const { count: humanAttendance } = await supabase
    .from("whatsapp_sessions")
    .select("*", { count: "exact", head: true })
    .or("human_support_active.eq.true,stage.eq.humano");

  // Total Leads
  const { count: totalLeads } = await supabase
    .from("whatsapp_leads")
    .select("*", { count: "exact", head: true });

  // Leads Novos
  const { count: newLeads } = await supabase
    .from("whatsapp_leads")
    .select("*", { count: "exact", head: true })
    .eq("lead_status", "novo");

  // Suporte / Pedidos
  const { count: supportRequests } = await supabase
    .from("order_support_requests")
    .select("*", { count: "exact", head: true });

  // Stages Ativos
  const { data: stagesData } = await supabase
    .from("whatsapp_sessions")
    .select("stage");

  const activeStages = stagesData
    ? Object.entries(
        stagesData.reduce((acc: Record<string, number>, item) => {
          acc[item.stage] = (acc[item.stage] || 0) + 1;
          return acc;
        }, {})
      ).map(([stage, count]) => ({ stage, count }))
    : [];

  const { data: sessionsData } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .limit(500);

  const { data: contactsData } = await supabase
    .from("whatsapp_contacts")
    .select("*")
    .limit(500);

  const { data: leadsData } = await supabase
    .from("whatsapp_leads")
    .select("*")
    .limit(500);

  const contactsRows = (contactsData ?? []) as GenericRow[];
  const sessionRows = (sessionsData ?? []) as GenericRow[];
  const leadRows = (leadsData ?? []) as GenericRow[];

  const contactsByPhone = new Map<string, GenericRow>();
  for (const contact of contactsRows) {
    const contactPhone = pickString(contact, PHONE_KEYS);
    if (!contactPhone) continue;
    contactsByPhone.set(normalizePhone(contactPhone), contact);
  }

  const leadPhones = new Set<string>();
  for (const lead of leadRows) {
    const leadPhone = pickString(lead, PHONE_KEYS);
    if (!leadPhone) continue;
    leadPhones.add(normalizePhone(leadPhone));
  }

  const sourceRows = sessionRows.length > 0 ? sessionRows : contactsRows;

  const conversationRows: DashboardConversationRow[] = sourceRows.map(
    (row, index) => {
      const rowPhone = pickString(row, PHONE_KEYS);
      const normalizedPhone = normalizePhone(rowPhone);
      const contact = contactsByPhone.get(normalizedPhone);

      const name =
        pickString(row, NAME_KEYS) ||
        (contact ? pickString(contact, NAME_KEYS) : "") ||
        "Sem nome";

      const stage = pickString(row, ["stage", "etapa"]) || "-";

      const hasHumanSupport =
        pickBoolean(row, ["human_support_active", "is_human_support"]) ?? false;
      const isHumanByStage = stage.toLowerCase() === "humano";
      const status: "bot" | "humano" =
        hasHumanSupport || isHumanByStage ? "humano" : "bot";

      const leadFlag =
        pickBoolean(row, ["is_lead", "lead", "lead_active"]) ?? false;
      const leadByStatus =
        pickString(row, ["lead_status"]).toLowerCase() === "lead" ||
        pickString(row, ["lead_status"]).toLowerCase() === "novo";
      const lead = leadFlag || leadByStatus || leadPhones.has(normalizedPhone) ? "S" : "N";

      const lastInteraction =
        toDateString(pickString(row, LAST_INTERACTION_KEYS)) ||
        (contact
          ? toDateString(pickString(contact, LAST_INTERACTION_KEYS))
          : null);

      const idValue = row.id;
      const id =
        typeof idValue === "string" || typeof idValue === "number"
          ? String(idValue)
          : `${normalizedPhone || "row"}-${index}`;

      return {
        id,
        phone: rowPhone || "-",
        name,
        stage,
        status,
        lead,
        lastInteraction,
      };
    }
  );

  let latestTimestamp: string | null = null;
  for (const row of conversationRows) {
    if (!row.lastInteraction) continue;
    if (!latestTimestamp || row.lastInteraction > latestTimestamp) {
      latestTimestamp = row.lastInteraction;
    }
  }

  return {
    totalContacts,
    humanAttendance,
    totalLeads,
    newLeads,
    supportRequests,
    activeStages,
    conversationRows,
    lastDataUpdate: latestTimestamp,
  };
}
