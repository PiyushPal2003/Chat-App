import React, { useMemo } from "react";

/**
 * ChatHeader - Displays chat avatar, name, and online/typing status
 * 
 * Props:
 * - chatMeta: The chat metadata from API (contains members, isGroupChat, etc.)
 * - user: Current logged-in user
 * - typingStatus: Object tracking who's typing in which chat
 * - currChatId: Current chat ID
 * - chatMembers: Object mapping memberId -> {name, photo}
 * - onInfoClick: Callback when info icon is clicked
 */
export default function ChatHeader({ 
  chatMeta, 
  user, 
  typingStatus, 
  currChatId, 
  chatMembers,
  onInfoClick 
}) {
  // Calculate how many group members are online (excluding self)
  const groupOnlineCount = useMemo(() => {
    return chatMeta?.chat?.members?.reduce(
      (acc, member) => acc + (member._id !== user.id && user.onlineUsers[member._id] ? 1 : 0), 0
    );
  }, [chatMeta, user.onlineUsers, user.id]);

  // Get the other member in 1:1 chat
  const otherMember = chatMeta?.chat?.members?.find((m) => m._id !== user.id);

  // Determine avatar source
  const avatarSrc = chatMeta?.chat?.isGroupChat
    ? chatMeta?.chat?.photo === "NA"
      ? "./assets/grp_img.jpg"
      : chatMeta?.chat?.photo
    : otherMember?.profilePhoto === "NA"
      ? "./assets/user_img.jpg"
      : otherMember?.profilePhoto;

  // Determine display name
  const displayName = chatMeta?.chat?.isGroupChat
    ? chatMeta?.chat?.grpname
    : otherMember?.name;

  // Render online/typing status
  const renderStatus = () => {
    if (chatMeta?.chat?.isGroupChat) {
      const usersTyping = typingStatus?.[currChatId] || [];

      if (usersTyping.length > 0) {
        return (
          <span className="text-[0.8rem] text-blue-500">
            {chatMembers[usersTyping[0]]?.name}{" "}
            {usersTyping.length > 1 ? `and ${usersTyping.length - 1} others ` : ""}
            typing...
          </span>
        );
      }

      return groupOnlineCount > 0 ? (
        <span className="text-[0.8rem] text-green-500">
          {groupOnlineCount} member{groupOnlineCount > 1 ? "s" : ""} online
        </span>
      ) : (
        <span className="text-[0.8rem] text-red-500">No members online</span>
      );
    }

    // 1:1 chat
    const isOnline = user.onlineUsers[otherMember?._id];
    return isOnline ? (
      <span className="text-[0.7rem] text-green-500">🟢 Online</span>
    ) : (
      <span className="text-[0.7rem] text-red-500">🔴 Offline</span>
    );
  };

  return (
    <div className="w-full h-16 border flex flex-row items-center" id="header">
      <div className="w-full h-full flex flex-row items-center relative pl-12 lg:pl-3">
        <img
          src={avatarSrc}
          className="rounded-full object-cover h-4/5"
          style={{ aspectRatio: "1/1" }}
          alt="chat avatar"
        />
        <div>
          <h1 className="font-medium text-lg ml-2">{displayName}</h1>
          <h1 className="text-sm ml-2">{renderStatus()}</h1>
        </div>
      </div>

      {/* Info icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6 mr-4 cursor-pointer chatinfo-icon"
        onClick={onInfoClick}
        aria-label="Open chat settings"
        role="button"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
        />
      </svg>
    </div>
  );
}
