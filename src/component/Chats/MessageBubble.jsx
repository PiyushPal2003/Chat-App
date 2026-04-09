import React from "react";
import { dateFormat } from "../../Utilities";

/**
 * MessageBubble - Renders a single chat message
 * 
 * Props:
 * - message: The message object
 * - isMine: Boolean - is this message from the current user?
 * - isGroupChat: Boolean - is this a group chat?
 * - senderInfo: {name, photo} of the message sender (for group chats)
 */
export default function MessageBubble({ message, isMine, isGroupChat, senderInfo }) {
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

  return (
    <div
      className={`py-2 px-5 mb-2 w-fit rounded-4xl max-w-[45%] min-w-0 ${
        isMine ? "bg-blue-400 ml-auto" : "bg-gray-200"
      }`}
    >
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

      {/* Message text */}
      <p className="break-words">{msg.message?.text ?? ""}</p>

      {/* Timestamp */}
      <p className="text-xs italic text-right">{dateFormat(msg.timestamp)}</p>

      {/* Status (pending, failed, etc.) */}
      {msg.status && <p className="text-xs italic text-right">{msg.status}</p>}
    </div>
  );
}
