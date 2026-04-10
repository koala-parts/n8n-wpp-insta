export type InstagramUser = {
  id: string;
  username: string;
  name?: string;
};

export type InstagramConversation = {
  id: string;
  conversationId: string;
  participants: {
    data: Array<{
      username: string;
      id: string;
    }>;
  };
};

export type InstagramMessage = {
  id: string;
  createdTime: string;
  from: InstagramUser;
  to: {
    data: InstagramUser[];
  };
  message: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  direction: "inbound" | "outbound";
};

export type InstagramConversationDetails = {
  id: string;
  participants: {
    data: Array<{
      username: string;
      id: string;
    }>;
  };
};

export type InstagramConversationsResponse = {
  conversations: InstagramConversation[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
  error?: string;
};

export type InstagramConversationResponse = {
  conversation: InstagramConversationDetails;
  messages: InstagramMessage[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
  error?: string;
};

export type InstagramContact = {
  id: string;
  contactId: string;
  phone: string;
  name: string;
  stage: string;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  transferRequestedById?: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  totalMessages: number;
  username: string;
  profilePictureUrl?: string | null;
  platform: "instagram";
  userIdInstagram?: string | null;
  isAssignedToCurrentUser?: boolean;
  assignmentId?: string | null;
};

export type InstagramChatMessage = {
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
  storyLink?: string | null;
};
