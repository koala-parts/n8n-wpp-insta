import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { igsid, message, senderName, senderId, contactId } = body;

    if (!igsid || !message) {
      return NextResponse.json(
        { error: "igsid and message are required" },
        { status: 400 }
      );
    }

    const pageAccessToken = process.env.INSTAGRAM_ACESS_TOKEN;
    const instagramPageId = process.env.INSTAGRAM_PAGE_ID || "17841405499305368";

    if (!pageAccessToken) {
      return NextResponse.json(
        { error: "Instagram page access token not configured" },
        { status: 500 }
      );
    }

    const pageId = instagramPageId;
    const apiVersion = "v24.0";
    const url = `https://graph.instagram.com/${apiVersion}/${pageId}/messages`;

    console.log("[Instagram] Token:", pageAccessToken.substring(0, 20) + "...");
    console.log("[Instagram] IGSID:", igsid);
    console.log("[Instagram] API Version:", apiVersion);

    console.log("[Instagram] Request URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pageAccessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: igsid },
        message: { text: message },
      }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    console.log("[Instagram] Response Status:", response.status);
    console.log("[Instagram] Response Body:", responseText);

    if (!response.ok) {
      const errorMessage = data.error?.message || JSON.stringify(data);
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    try {
      const supabase = createServerSupabase();
      const now = new Date().toISOString();
      const normalizedSenderName =
        typeof senderName === "string" && senderName.trim()
          ? senderName.trim()
          : "Usuário";

      const normalizedContactId =
        typeof contactId === "string" && contactId.trim()
          ? contactId.trim()
          : "";

      if (!normalizedContactId) {
        return NextResponse.json(
          { error: "Contact ID is required" },
          { status: 400 }
        );
      }

      await supabase.from("instagram_messages").insert({
        contact_id: normalizedContactId,
        direction: "outbound",
        sender_type: normalizedSenderName,
        message_type: "text",
        content: message,
        stage: "humano",
        created_at: now,
      });

      const { data: existingConv } = await supabase
        .from("instagram_conversations")
        .select("id, stage")
        .eq("user_id", igsid)
        .maybeSingle();

      if (existingConv) {
        if (existingConv.stage !== "HUMAN_ACTIVE") {
          await supabase
            .from("instagram_conversations")
            .update({ stage: "HUMAN_ACTIVE" })
            .eq("id", existingConv.id);
        }
      } else {
        await supabase
          .from("instagram_conversations")
          .insert({
            user_id: igsid,
            stage: "HUMAN_ACTIVE",
          });
      }

      if (typeof senderId === "string" && senderId.trim()) {
        const normalizedSenderId = senderId.trim();
        const nowIso = new Date().toISOString();

        await supabase
          .from("user_active_contacts")
          .update({ active: false })
          .eq("contact_id", normalizedContactId)
          .eq("active", true);

        const { data: existingAssignment } = await supabase
          .from("user_active_contacts")
          .select("id")
          .eq("contact_id", normalizedContactId)
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
            contact_id: normalizedContactId,
            platform: "instagram",
            assigned_at: nowIso,
            active: true,
            transferred_by: null,
          });
        }
      }
    } catch (dbError) {
      console.error("Error saving message to database:", dbError);
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error sending Instagram message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}