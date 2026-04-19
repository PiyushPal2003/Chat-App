import React from "react";
import { dateFormat } from "../../Utilities";
import MessageActionMenu from "./MessageActionMenu";

/**
 * MessageBubble - Renders a single chat message
 * 
 * Props:
 * - message: The message object
 * - isMine: Boolean - is this message from the current user?
 * - isGroupChat: Boolean - is this a group chat?
 * - senderInfo: {name, photo} of the message sender (for group chats)
 */
export default function MessageBubble({
  message,
  isMine,
  canEdit,
  isGroupChat,
  senderInfo,
  chatMembers,
  currentUserId,
  onReply,
  onForward,
  onEdit,
}) {
  const msg = message;

  // System generated messages (e.g., "User joined the group")
  if (msg.message?.text?.includes?.("|SystemGenerated|")) {
    return (
      <div className="flex justify-center mb-2 text-[0.8rem]">
        <span
          className="bg-[#665757a6] text-white py-2 rounded-full flex justify-center items-center w-fit gap-1"
          style={{ padding: "0.3rem 0.4rem" }}
        >
          {msg.message.text.replace("|SystemGenerated|", "").trim()}
        </span>
      </div>
    );
  }

  // Determine sender avatar for group chats
  const senderPhoto =
    senderInfo?.photo?.includes("googleusercontent") || senderInfo?.photo === "NA"
      ? "./assets/user_img.jpg"
      : senderInfo?.photo;

  const replySenderName = msg.replyTo?.senderId
    ? (String(msg.replyTo.senderId) === String(currentUserId)
        ? "You"
        : chatMembers?.[msg.replyTo.senderId]?.name || "User")
    : (msg.replyTo?.senderName || "User");
  const mentionSet = new Set((msg.mentions || []).map((m) => String(m.userId)));
  const mentionNameMap = (msg.mentions || []).reduce((acc, m) => {
    acc[m.name] = String(m.userId);
    return acc;
  }, {});
  const renderTextWithMentions = (text) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (!part.startsWith("@")) return <React.Fragment key={`t-${idx}`}>{part}</React.Fragment>;
      const mentionName = part.slice(1);
      const mentionId = mentionNameMap[mentionName];
      if (mentionId && mentionSet.has(mentionId)) {
        return (
          <span key={`m-${idx}`} className="font-semibold text-blue-900">
            {part}
          </span>
        );
      }
      return <React.Fragment key={`t-${idx}`}>{part}</React.Fragment>;
    });
  };

  return (
    <div
      className={`py-2 px-5 mb-2 w-fit rounded-4xl max-w-[45%] min-w-0 relative ${
        isMine ? "bg-blue-400 ml-auto" : "bg-gray-200"
      }`}
    >
      {!msg.message?.text?.includes?.("|SystemGenerated|") && (
        <MessageActionMenu
          message={msg}
          canEdit={canEdit}
          onReply={onReply}
          onForward={onForward}
          onEdit={onEdit}
        />
      )}
      {/* Show sender info in group chats (for messages from others) */}
      {isGroupChat && !isMine && senderInfo && (
        <div className="flex align-center mb-1 gap-2 min-w-0">
          <img
            src={senderPhoto}
            className="rounded-full object-cover"
            style={{ aspectRatio: "1", height: "1.5rem" }}
            alt={senderInfo.name}
          />
          <p className="text-blue-950 truncate">{senderInfo.name}</p>
        </div>
      )}

      {/* File attachments */}
      {msg.message?.url?.length > 0 && (
        <div className="min-w-0">
          {msg.message.url.map((item) => (
            <a
              className="bg-[#d1d5dc] px-2 rounded flex mb-1 max-w-full min-w-0 break-all"
              href={item}
              key={item}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="break-all">{item.split("_").pop()}</span>
            </a>
          ))}
        </div>
      )}

      {msg.replyTo?.messageId && (
        <div className="mb-1 rounded-md bg-black/10 px-2 py-1 border-l-2 border-blue-500">
          <p className="text-[10px] font-semibold text-blue-900 truncate">{replySenderName}</p>
          <p className="text-[10px] text-gray-800 truncate">
            {msg.replyTo?.text?.trim() || "Message"}
          </p>
        </div>
      )}

      {/* Message text */}
      {(msg.forwardInfo?.isForwarded || msg.message?.text?.includes?.("|Forwarded|")) && (
        <p className="text-[11px] font-semibold text-gray-700 mb-0.5">Forwarded</p>
      )}
      {msg.isEdited && (
        <p className="text-[11px] font-semibold text-gray-700 mb-0.5">Edited</p>
      )}
      <p className="break-words">
        {renderTextWithMentions((msg.message?.text ?? "").replace("|Forwarded|", "").trim())}
      </p>

      {/* Timestamp */}
      <p className="text-xs italic text-right">{dateFormat(msg.timestamp)}</p>

      {/* Status (pending, failed, etc.) */}
      {msg.status && <p className="text-xs italic text-right">{msg.status}</p>}
    </div>
  );
}
