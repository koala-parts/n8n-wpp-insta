import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

const INSTAGRAM_API_VERSION = "v25.0";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

type Conversation = {
  id: string;
  conversationId: string;
  participants: Array<{ username: string; id: string }>;
};

type ProfileData = {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl: string | null;
};

type ProfileResult = { userId: string; profile: ProfileData | null };

async function getInstagramConversations(
  accessToken: string,
  after?: string
): Promise<{ data: Conversation[]; paging?: { cursors?: { after?: string } } }> {
  const url = new URL(`${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/me/conversations`);
  url.searchParams.set("platform", "instagram");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", "25");

  if (after) {
    url.searchParams.set("after", after);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    data: data.data.map((conv: { id: string; conversation_id: string; participants?: { data: Array<{ username: string; id: string }> } }) => ({
      id: conv.id,
      conversationId: conv.id,
      participants: conv.participants?.data || [],
    })),
    paging: data.paging,
  };
}

async function getConversationDetails(
  conversationId: string,
  accessToken: string,
  businessUsername: string
): Promise<{
  contactUsername: string;
  userIdInstagram: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  messages: Array<{
    id: string;
    createdTime: string;
    from: { id: string; username: string };
    message: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
    story: { mention?: { link: string }; reply_to?: { link: string } } | null;
  }>;
  hasNext: boolean;
  nextCursor?: string;
}> {
  const url = new URL(`${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/${conversationId}`);
  url.searchParams.set("fields", "participants{username,id},messages{created_time,from,message,media_url,media_type,story}");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", "20");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.status}`);
  }

  const data = await response.json();

  const participants = data.participants?.data || data.participants || [];
  const otherParticipant = participants.find(
    (p: { username: string }) => p.username !== "me" && p.username !== businessUsername
  );
  const contactUsername = otherParticipant?.username || participants[0]?.username || "";

  const messages = data.messages?.data || [];

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
  );

  const lastMessage = sortedMessages[sortedMessages.length - 1];
  let lastMessagePreview = "Sem mensagens";
  if (lastMessage) {
    if (lastMessage.media_url) {
      lastMessagePreview = lastMessage.media_type || "Mídia";
    } else if (lastMessage.story?.mention) {
      lastMessagePreview = "Menção a Story";
    } else if (lastMessage.story?.reply_to) {
      lastMessagePreview = "Resposta a Story";
    } else if (lastMessage.message) {
      lastMessagePreview = lastMessage.message;
    } else if (!lastMessage.message && !lastMessage.media_url) {
      lastMessagePreview = lastMessage.media_type || "Mídia";
    }
  }

  return {
    contactUsername,
    userIdInstagram: otherParticipant?.id || null,
    lastMessagePreview,
    lastMessageAt: lastMessage?.created_time || null,
    messages: sortedMessages.map((msg: { id: string; created_time: string; from: { id: string; username: string }; message: string | null; media_url: string | null; media_type: string | null; story: { mention?: { link: string }; reply_to?: { link: string } } | null }) => ({
      id: msg.id,
      createdTime: msg.created_time,
      from: msg.from,
      message: msg.message,
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
      story: msg.story,
    })),
    hasNext: Boolean(data.messages?.paging?.next),
    nextCursor: data.messages?.paging?.cursors?.after,
  };
}

async function getProfiles(
  userIds: string[],
  accessToken: string
): Promise<Map<string, ProfileData>> {
  if (userIds.length === 0) return new Map();

  const uniqueIds = [...new Set(userIds)];
  const profilePromises = uniqueIds.map(async (userId) => {
    try {
      const url = new URL(`${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/${userId}`);
      url.searchParams.set("fields", "id,username,name,profile_pic");
      url.searchParams.set("access_token", accessToken);

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) return { userId, profile: null };

      const data = await response.json();
      return {
        userId,
        profile: {
          id: data.id,
          username: data.username,
          name: data.name,
          profilePictureUrl: data.profile_pic || data.profile_picture_url || null,
        },
      };
    } catch {
      return { userId, profile: null };
    }
  });

  const results = await Promise.all(profilePromises);
  const map = new Map<string, ProfileData>();
  for (const r of results) {
    if (r.profile) {
      map.set(r.userId, r.profile);
    }
  }
  return map;
}

async function getAssignments(userIdsInstagram: string[], supabase: ReturnType<typeof createServerSupabase>): Promise<Map<string, { userIdInstagram: string; assignedUserId: string | null; assignedUserName: string | null }>> {
  if (userIdsInstagram.length === 0) return new Map();

  const { data, error } = await supabase
    .from("user_active_contacts")
    .select("id, user_id, user_id_instagram, users!user_active_contacts_user_id_fkey(id, name)")
    .in("user_id_instagram", userIdsInstagram)
    .eq("active", true);

  if (error) {
    console.error("Error fetching assignments:", error);
    return new Map();
  }

  const result = new Map<string, { userIdInstagram: string; assignedUserId: string | null; assignedUserName: string | null }>();
  (data ?? []).forEach((row) => {
    const userIdInstagram = row.user_id_instagram;
    if (userIdInstagram) {
      result.set(userIdInstagram, {
        userIdInstagram,
        assignedUserId: row.user_id,
        assignedUserName: (row.users as { id?: string; name?: string } | null)?.name ?? null,
      });
    }
  });

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.INSTAGRAM_ACESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token de acesso do Instagram não configurado" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const after = searchParams.get("after") || undefined;
    const includeMessages = searchParams.get("includeMessages") === "true";

    const supabase = createServerSupabase();
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

    const convData = await getInstagramConversations(accessToken, after);
    const conversations = convData.data;

    if (conversations.length === 0) {
      return NextResponse.json({
        conversations: [],
        hasNext: false,
        nextCursor: null,
      });
    }

    const businessResponse = await fetch(
      `${INSTAGRAM_GRAPH_URL}/${INSTAGRAM_API_VERSION}/me?fields=username&access_token=${accessToken}`,
      { cache: "no-store" }
    );
    const businessUsername = businessResponse.ok
      ? (await businessResponse.json()).username
      : "me";

    const detailsPromises = conversations.map((conv) =>
      getConversationDetails(conv.id, accessToken, businessUsername).catch((err) => {
        console.error(`Error fetching conversation ${conv.id}:`, err);
        return null;
      })
    );

    const detailsResults = await Promise.all(detailsPromises);

    const userIdsInstagram = detailsResults
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map((d) => d.userIdInstagram)
      .filter((id): id is string => typeof id === "string" && id !== "");

    const [profileMap, assignmentMap] = await Promise.all([
      getProfiles(userIdsInstagram, accessToken),
      getAssignments(userIdsInstagram, supabase),
    ]);

    const contacts = conversations
      .map((conv, index) => {
        const details = detailsResults[index];
        if (!details) return null;

        const username = details.contactUsername || `Usuário ${conv.id.slice(-4)}`;
        const userIdInstagram = details.userIdInstagram ?? null;
        const profile = userIdInstagram ? profileMap.get(userIdInstagram) : null;
        const assignmentInfo = userIdInstagram ? assignmentMap.get(userIdInstagram) : null;

        return {
          id: conv.id,
          contactId: conv.id,
          phone: `@${username}`,
          name: username,
          stage: "-",
          lastMessagePreview: details.lastMessagePreview || "Sem mensagens",
          lastMessageAt: details.lastMessageAt || null,
          totalMessages: includeMessages ? details.messages.length : 0,
          username,
          profilePictureUrl: profile?.profilePictureUrl ?? null,
          platform: "instagram" as const,
          userIdInstagram,
          assignedUserId: assignmentInfo?.assignedUserId ?? null,
          assignedUserName: assignmentInfo?.assignedUserName ?? null,
          assignmentId: assignmentInfo ? `assign_${userIdInstagram}` : null,
          isAssignedToCurrentUser: assignmentInfo?.assignedUserId === userId,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const messagesByContact: Record<string, Array<{
      id: string;
      contactId: string;
      phone: string;
      direction: "inbound" | "outbound";
      senderType: "user" | "instagram_user";
      senderName: string;
      messageType: string;
      content: string;
      stage: string;
      storyLink: string | null;
      createdAt: string;
    }>> = {};

    if (includeMessages) {
      detailsResults.forEach((details, index) => {
        if (!details) return;
        const convId = conversations[index].id;
        const messages = details.messages
          .map((msg) => {
            const isFromBusiness = msg.from.username === businessUsername;
            const hasStoryMention = msg.story?.mention;
            const hasStoryReply = msg.story?.reply_to;
            let content = msg.message;
            let messageType = "text";

            if (msg.mediaUrl) {
              messageType = "image";
              content = msg.mediaUrl;
            } else if (hasStoryMention) {
              messageType = "story_mention";
              content = msg.message || "";
            } else if (hasStoryReply) {
              messageType = "story_reply";
              content = msg.message || "";
            } else if (!content) {
              messageType = "media";
              content = msg.mediaType ? `📎 ${msg.mediaType}` : "📎 Mídia";
            }

            const storyLink = msg.story?.mention?.link || msg.story?.reply_to?.link || null;

            return {
              id: msg.id,
              contactId: convId,
              phone: `@${msg.from.username}`,
              direction: (isFromBusiness ? "outbound" : "inbound") as "inbound" | "outbound",
              senderType: (isFromBusiness ? "user" : "instagram_user") as "user" | "instagram_user",
              senderName: msg.from.username,
              messageType,
              content,
              stage: "-",
              storyLink,
              createdAt: msg.createdTime,
            };
          })
          .sort(
            (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          );

        messagesByContact[convId] = messages;
      });
    }

    contacts.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      conversations: contacts,
      messages: messagesByContact,
      hasNext: Boolean(convData.paging?.cursors?.after),
      nextCursor: convData.paging?.cursors?.after || null,
    });
  } catch (error) {
    console.error("Error fetching Instagram conversations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar conversas" },
      { status: 500 }
    );
  }
}