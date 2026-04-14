import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

const MANUAL_STAGE = "humano";

export async function POST(request: NextRequest) {
	try {
		const { phone, message, senderName, senderId, contactId } = await request.json();

		if (!phone || !message) {
			return NextResponse.json(
				{ error: "Phone and message are required" },
				{ status: 400 }
			);
		}

		const zApiInstance = process.env.Z_API_INSTANCE;
		const zApiToken = process.env.Z_API_TOKEN;
		const zApiSecurityToken = process.env.Z_API_SECURITY_TOKEN;

		if (!zApiInstance || !zApiToken || !zApiSecurityToken) {
			return NextResponse.json(
				{ error: "Z-API configuration missing" },
				{ status: 500 }
			);
		}

		const url = `https://api.z-api.io/instances/${zApiInstance}/token/${zApiToken}/send-text`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"client-token": zApiSecurityToken,
			},
			body: JSON.stringify({
				phone,
				message,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			return NextResponse.json(data, { status: response.status });
		}

		// Save message to database with sender name
		try {
			const supabase = createServerSupabase();
			const normalizedPhone = phone.replace(/\D/g, "");
			const now = new Date().toISOString();
			let normalizedSenderName =
				typeof senderName === "string" && senderName.trim()
					? senderName.trim()
					: "Usuário";

			let messageContactId =
				typeof contactId === "string" && contactId.trim() ? contactId.trim() : "";

			if (!messageContactId) {
				const { data: contactRowExact } = await supabase
					.from("whatsapp_contacts")
					.select("id, phone")
					.eq("phone", normalizedPhone)
					.limit(1)
					.maybeSingle();

				if (contactRowExact?.id) {
					messageContactId = String(contactRowExact.id);
				} else {
					const { data: contactRows } = await supabase
						.from("whatsapp_contacts")
						.select("id, phone")
						.limit(5000);

					const matched = (contactRows ?? []).find(
						(row) => String(row.phone ?? "").replace(/\D/g, "") === normalizedPhone
					);

					if (matched?.id) {
						messageContactId = String(matched.id);
					}
				}
			}

			if (!messageContactId) {
				return NextResponse.json(
					{ error: "Contact not found for message" },
					{ status: 400 }
				);
			}

			if (typeof senderId === "string" && senderId.trim()) {
				const { data: userRow } = await supabase
					.from("users")
					.select("name")
					.eq("id", senderId.trim())
					.maybeSingle();

				if (userRow?.name && userRow.name.trim()) {
					normalizedSenderName = userRow.name.trim();
				}
			}

			await supabase.from("whatsapp_messages").insert({
				phone: normalizedPhone,
				contact_id: messageContactId,
				direction: "outbound",
				sender_type: normalizedSenderName,
				message_type: "text",
				content: message,
				stage: MANUAL_STAGE,
				created_at: now,
			});

			const { data: sessionRows } = await supabase
				.from("whatsapp_sessions")
				.select("phone")
				.limit(5000);

			const sessionPhone = (sessionRows ?? [])
				.map((row) => String(row.phone ?? ""))
				.find((phoneValue) => phoneValue.replace(/\D/g, "") === normalizedPhone);

			if (sessionPhone) {
				await supabase
					.from("whatsapp_sessions")
					.update({ stage: MANUAL_STAGE })
					.eq("phone", sessionPhone);
			}

			// If the conversation was finalized before, sending a new message should
			// bring it back to the sender queue and ownership.
			if (typeof senderId === "string" && senderId.trim()) {
				const normalizedSenderId = senderId.trim();
				const nowIso = new Date().toISOString();

				// Keep a single active owner for this contact.
				await supabase
					.from("user_active_contacts")
					.update({ active: false })
					.eq("contact_id", messageContactId)
					.eq("active", true);

				const { data: existingAssignment } = await supabase
					.from("user_active_contacts")
					.select("id")
					.eq("contact_id", messageContactId)
					.eq("user_id", normalizedSenderId)
					.order("assigned_at", { ascending: false })
					.limit(1)
					.maybeSingle();

				if (existingAssignment?.id) {
					await supabase
						.from("user_active_contacts")
						.update({
							active: true,
							assigned_at: nowIso,
							transferred_by: null,
						})
						.eq("id", existingAssignment.id);
				} else {
					await supabase.from("user_active_contacts").insert({
						user_id: normalizedSenderId,
						contact_id: messageContactId,
						assigned_at: nowIso,
						active: true,
						transferred_by: null,
					});
				}
			}
		} catch (dbError) {
			console.error("Error saving message to database:", dbError);
			// Don't fail the request if database save fails
		}

		return NextResponse.json(data, { status: 200 });
	} catch (error) {
		console.error("Error sending message:", error);
		return NextResponse.json(
			{ error: "Failed to send message" },
			{ status: 500 }
		);
	}
}