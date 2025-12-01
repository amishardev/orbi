import type { Timestamp } from 'firebase/firestore';

export type User = {
  id: string; // The Firebase Auth UID
  userId: string; // Duplicate for consistency if needed, often same as id
  email: string;
  username: string;
  name?: string; // Added for compatibility with mock data
  username_lowercase: string;
  displayName: string;
  displayName_lowercase: string;
  bio: string;
  headline?: string;
  location?: string;
  website?: string;
  joinDate: Timestamp;
  lastActive?: Timestamp;
  photoURL: string; // Cloudinary URL (alias for profilePicture for consistency)
  coverPhoto?: string; // Cloudinary URL
  jobTitle?: string;
  company?: string;
  education?: { degree: string, school: string, year: string }[];
  work?: { title: string, company: string, years: string }[];
  skills?: string[];
  experience?: Experience[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
  connectionsCount?: number;
  profileVisibility: 'public' | 'private' | 'connections-only';
  allowMessages: boolean;
  showEmail?: boolean;
  showLocation?: boolean;
  isVerified: boolean;
  verificationBadge?: string;
  interests: string[];
  relationshipStatus?: string;
  searchKeywords?: string[];
  following: string[]; // Array of user IDs the user is following
  followers: string[]; // Array of user IDs following the user
  friends?: string[]; // Array of friend user IDs
  // Presence fields
  isOnline?: boolean;
  lastSeen?: Timestamp;
  isAgent?: boolean;
  isDisabled?: boolean;
};

export type Experience = {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export type Community = {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  createdBy?: string; // uid of creator
  adminId?: string; // kept for compatibility, likely same as createdBy
  members: string[]; // array of user IDs
  createdAt?: Timestamp;
  lastMessageAt?: Timestamp;
  isPublic?: boolean;
  memberDetails?: {
    [userId: string]: {
      displayName: string;
      photoURL?: string;
    }
  };
  // Mock data compatibility
  slug?: string;
  avatar?: string;
  banner?: string;
  memberCount?: number;
  unreadCount?: number;
};

export type Conversation = {
  id: string;
  userId: string;
  messages: {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
  }[];
};

export type MessageType = 'text' | 'image' | 'gif' | 'system' | 'video' | 'post_share';

export type CommunityMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: Timestamp | null; // null for optimistic UI
  type: MessageType;
  imageUrl?: string; // For image messages
  videoUrl?: string; // For video messages
  shareData?: {
    postId: string;
    postAuthor: string;
    postImage?: string;
    postText?: string;
    postType: 'image' | 'video' | 'text';
  };
  user?: {
    displayName: string;
    photoURL?: string | null;
  };
  replyTo?: {
    id: string;
    senderName: string;
    textPreview: string;
  };
};

export type ReactionEmoji = '👍' | '❤️' | '😂' | '💀' | '🔥' | '😍' | '🗿';

export type EmbedData = {
  url: string;
  type: 'website' | 'youtube' | 'image' | 'video' | 'loading' | 'error' | 'spotify' | 'applemusic' | 'instagram';
  title?: string;
  description?: string;
  imageUrl?: string;
  author?: string;
  videoId?: string;
  embedUrl?: string;
};

export type Post = {
  id: string;
  userId: string;
  username?: string;
  authorDisplayName: string;
  authorPhotoURL: string;
  caption: string;
  mediaUrl?: string | null;
  mediaUrls?: string[] | null;
  mediaType?: 'image' | 'video' | null;
  imageHint?: string;
  createdAt?: Timestamp;
  reactions: Partial<Record<ReactionEmoji, string[]>>;
  commentsCount: number;
  totalReactions: number;
  embed?: EmbedData;
  // Fields from old data structure, kept for compatibility for now.
  image?: string;
  timestamp?: string;
  bgColorClassName?: string;
  communityId?: string;
  imageUrl?: string;
};

export type Reaction = {
  userId: string;
  username: string;
  emoji: ReactionEmoji;
  createdAt: Timestamp;
}

export type Comment = {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: Timestamp;
};


export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
  type?: MessageType; // Added for consistency
  shareData?: {
    postId: string;
    postAuthor: string;
    postImage?: string;
    postText?: string;
    postType: 'image' | 'video' | 'text';
  };
  replyTo?: {
    id: string;
    senderName: string;
    textPreview: string;
  };
};

export type Chat = {
  id: string;
  participants: string[]; // array of user IDs
  participantDetails: {
    [userId: string]: {
      displayName: string;
      photoURL: string;
      username: string;
    }
  };
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Timestamp;
  };
  createdAt: Timestamp;
  unreadCounts?: {
    [userId: string]: number;
  };
};

export type Notification = {
  id: string;
  type: 'comment' | 'reaction' | 'follow' | 'friend_request' | 'friend_accept';
  fromUserId: string;
  fromUsername: string;
  fromUserPhotoURL: string;
  targetId: string; // e.g., postId or commented-on userId
  message: string;
  timestamp: Timestamp;
  isRead: boolean;
  metadata?: {
    commentText?: string;
    reactionEmoji?: ReactionEmoji;
  };
};

export type FriendRequest = {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromUserDisplayName: string;
  fromUserProfilePicture: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
};
