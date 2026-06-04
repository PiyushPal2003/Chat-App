import React, { useCallback } from "react";
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
 * - lastSentSeenRef: Reference to the last seen message ID
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
  canDelete,
  onDelete,
  readState,
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
  const getAttachmentLabel = (url) => {
    const raw = url.split("_").pop() || "Attachment";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };
  const deletedForMe = Array.isArray(msg.deleted?.for) &&
    msg.deleted.for.some((id) => String(id) === String(currentUserId));
  const deletedForEveryone = (msg.deleted?.status || "none") !== "none";
  const deletedText = deletedForMe
    ? "You deleted this message"
    : (deletedForEveryone ? (msg.deleted?.text || "This message was deleted") : "");
  const isDeletedMessage = Boolean(deletedText);

  const seenStatus = useCallback(() => { 
    if(!isMine) return null;
    const members = Object.keys(chatMembers).filter((id) => String(id) !== String(currentUserId));

    const seenCount = members.filter(userId => {
      const lastSeenId = readState[userId]?.lastSeenMessageId;

      if (!lastSeenId) return false;

      return lastSeenId >= msg._id;
    }).length;

    // console.log(chatMembers, members, seenCount, readState);

    if(members.length === seenCount) return "✓✓";
    else return `✓`;

  }, [readState, msg._id])

  return (
    <div
      className={`relative mb-2 w-fit min-w-0 max-w-[82%] sm:max-w-[72%] lg:max-w-[58%] pl-3 pr-10 py-2.5 shadow-sm ${
        isMine
          ? "ml-auto bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-br-md"
          : "bg-white text-[#111b21] rounded-2xl rounded-bl-md"
      }`}
    >
      <div className="absolute right-1.5 z-10 flex flex-col items-center justify-between">
        <div>
          {!msg.message?.text?.includes?.("|SystemGenerated|") && !isDeletedMessage && (
            <MessageActionMenu
              message={msg}
              canEdit={canEdit}
              onReply={onReply}
              onForward={onForward}
              onEdit={onEdit}
              canDelete={canDelete}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>

      <div className="absolute bottom-1 right-2 text-[10px] text-gray-600 leading-none">
        {seenStatus()}
      </div>
      {/* Show sender info in group chats (for messages from others) */}
      {isGroupChat && !isMine && senderInfo && (
        <div className="mb-1.5 flex min-w-0 items-center gap-2">
          <img
            src={senderPhoto}
            className="h-6 w-6 rounded-full object-cover"
            alt={senderInfo.name}
          />
          <p className="truncate text-sm font-medium text-blue-900">{senderInfo.name}</p>
        </div>
      )}

      {isDeletedMessage ? (
        <p className="mt-1 pr-1 italic text-gray-700 text-sm break-words">{deletedText}</p>
      ) : (
        <>
          {/* File attachments */}
          {msg.message?.url?.length > 0 && (
            <div className="mb-1 min-w-0 space-y-1.5">
              {msg.message.url.map((item) => (
                <a
                  className="flex max-w-full min-w-0 items-center gap-2 rounded-lg bg-black/5 px-2.5 py-1.5 hover:bg-black/10"
                  href={item}
                  key={item}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0 text-gray-600">
                    <path fillRule="evenodd" d="M19.5 21a3 3 0 0 0 3-3V8.121a3 3 0 0 0-.879-2.121l-3.621-3.621A3 3 0 0 0 15.879 1.5H7.5a3 3 0 0 0-3 3v13.5a3 3 0 0 0 3 3h12ZM9 7.5a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5H9Zm0 3a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5H9Zm0 3a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5H9Z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate text-sm">{getAttachmentLabel(item)}</span>
                </a>
              ))}
            </div>
          )}

          {msg.replyTo?.messageId && (
            <div className="mb-1.5 rounded-md border-l-2 border-blue-500 bg-black/10 px-2 py-1">
              <p className="text-[10px] font-semibold text-blue-900 truncate">{replySenderName}</p>
              <p className="text-[10px] text-gray-800 truncate">
                {msg.replyTo?.text?.trim() || "Message"}
              </p>
            </div>
          )}

          {/* Message text */}
          <div className="pr-1">
          <p className="break-words text-[0.94rem] leading-relaxed whitespace-pre-wrap">
            {renderTextWithMentions((msg.message?.text ?? "").replace("|Forwarded|", "").trim())}
          </p>
          </div>
        </>
      )}

      {/* Timestamp */}
      <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-gray-600">
        {!isDeletedMessage && (msg.forwardInfo?.isForwarded || msg.message?.text?.includes?.("|Forwarded|")) && (
          <span className="rounded bg-black/10 px-1.5 py-0.5 font-medium">Forwarded</span>
        )}
        {!isDeletedMessage && msg.isEdited && (
          <span className="rounded bg-black/10 px-1.5 py-0.5 font-medium">Edited</span>
        )}
        <span className="italic">{dateFormat(msg.timestamp)}</span>
      </div>

      {/* Status (pending, failed, etc.) */}
      {msg.status && <p className="text-[11px] italic text-right text-gray-600">{msg.status}</p>}
    </div>
  );
}
