import { NextRequest, NextResponse } from "next/server";
import { addZApiContact, fetchZApiContacts, fetchZApiProfilePicture } from "@/lib/z-api";
import { createServerSupabase } from "@/lib/supabase";

type CachedPicture = {
  url: string;
  expiresAt: number;
};

const PICTURE_TTL_MS = 10 * 60 * 1000;
const pictureCache = new Map<string, CachedPicture>();

function getCachedPicture(phone: string) {
  const cached = pictureCache.get(phone);
  if (!cached) return undefined;
  if (Date.now() > cached.expiresAt) {
    pictureCache.delete(phone);
    return undefined;
  }
  return cached.url;
}

function setCachedPicture(phone: string, url: string) {
  pictureCache.set(phone, {
    url,
    expiresAt: Date.now() + PICTURE_TTL_MS,
  });
}

export async function GET() {
  try {
    const contacts = await fetchZApiContacts();
    const supabase = createServerSupabase();
    const [{ data: dbContacts }, { data: assignments }, { data: users }, { data: sessions }] =
      await Promise.all([
        supabase.from("whatsapp_contacts").select("id, phone, photo").limit(5000),
        supabase
          .from("user_active_contacts")
          .select("contact_id, user_id, transferred_by, assigned_at")
          .eq("active", true)
          .order("assigned_at", { ascending: false })
          .limit(5000),
        supabase.from("users").select("id, name").limit(5000),
        supabase
          .from("whatsapp_sessions")
          .select("phone, stage, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5000),
      ]);

    const contactIdByPhone = new Map<string, string>();
    const dbPhotoByPhone = new Map<string, string>();
    (dbContacts ?? []).forEach((row) => {
      const id = typeof row.id === "string" ? row.id : "";
      const phone = typeof row.phone === "string" ? row.phone.replace(/\D/g, "") : "";
      const dbPhoto = typeof row.photo === "string" && row.photo.trim() ? row.photo.trim() : "";
      if (id && phone && !contactIdByPhone.has(phone)) {
        contactIdByPhone.set(phone, id);
      }
      if (phone && dbPhoto && !dbPhotoByPhone.has(phone)) {
        dbPhotoByPhone.set(phone, dbPhoto);
      }
    });

    const userNameById = new Map<string, string>();
    (users ?? []).forEach((row) => {
      const id = typeof row.id === "string" ? row.id : "";
      const name = typeof row.name === "string" ? row.name : "";
      if (id && name) {
        userNameById.set(id, name);
      }
    });

    const assignmentByContactId = new Map<
      string,
      { userId: string | null; userName: string | null; transferRequestedById: string | null }
    >();
    (assignments ?? []).forEach((row) => {
      const contactId = typeof row.contact_id === "string" ? row.contact_id : "";
      if (!contactId || assignmentByContactId.has(contactId)) return;
      const userId = typeof row.user_id === "string" ? row.user_id : null;
      const transferRequestedById =
        typeof row.transferred_by === "string" && row.transferred_by.trim() !== ""
          ? row.transferred_by
          : null;
      assignmentByContactId.set(contactId, {
        userId,
        userName: userId ? userNameById.get(userId) ?? null : null,
        transferRequestedById,
      });
    });

    const stageByPhone = new Map<string, string>();
    (sessions ?? []).forEach((row) => {
      const phone = typeof row.phone === "string" ? row.phone.replace(/\D/g, "") : "";
      const stage = typeof row.stage === "string" && row.stage.trim() ? row.stage : "-";
      if (phone && !stageByPhone.has(phone)) {
        stageByPhone.set(phone, stage);
      }
    });

    const contactsWithPhoto = await Promise.all(
      contacts.map(async (contact) => {
        const cachedPicture = getCachedPicture(contact.phone);
        const contactId = contactIdByPhone.get(contact.phone) ?? null;
        const assignment = contactId ? assignmentByContactId.get(contactId) : undefined;
        const stage = stageByPhone.get(contact.phone) ?? "-";
        const dbPhoto = dbPhotoByPhone.get(contact.phone) ?? null;
        if (typeof cachedPicture === "string") {
          return {
            ...contact,
            photo: cachedPicture || dbPhoto,
            contactId,
            stage,
            assignedUserId: assignment?.userId ?? null,
            assignedUserName: assignment?.userName ?? null,
            transferRequestedById: assignment?.transferRequestedById ?? null,
          };
        }

        try {
          const photo = await fetchZApiProfilePicture(contact.phone);
          if (photo) {
            setCachedPicture(contact.phone, photo);
          }
          return {
            ...contact,
            photo: photo || dbPhoto,
            contactId,
            stage,
            assignedUserId: assignment?.userId ?? null,
            assignedUserName: assignment?.userName ?? null,
            transferRequestedById: assignment?.transferRequestedById ?? null,
          };
        } catch {
          return {
            ...contact,
            photo: dbPhoto,
            contactId,
            stage,
            assignedUserId: assignment?.userId ?? null,
            assignedUserName: assignment?.userName ?? null,
            transferRequestedById: assignment?.transferRequestedById ?? null,
          };
        }
      })
    );

    return NextResponse.json({ contacts: contactsWithPhoto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar contatos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      phone?: string;
    };

    await addZApiContact({
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      phone: body.phone ?? "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao adicionar contato";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

