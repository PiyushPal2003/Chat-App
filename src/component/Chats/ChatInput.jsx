import React, { useRef, useCallback, useEffect, useState } from "react";

/**
 * ChatInput - Message input area with file upload support
 * 
 * Props:
 * - fileUpload: Array of files to upload
 * - setFileUpload: Setter for fileUpload state
 * - onSend: Callback when sending a message (receives event)
 * - onTyping: Callback when user is typing
 * - isMember: Boolean - is current user still a member of this chat?
 */
export default function ChatInput({ 
  fileUpload, 
  setFileUpload, 
  onSend, 
  onTyping, 
  isMember,
  replyTarget,
  onClearReply,
  editTarget,
  onClearEdit,
  isGroupChat,
  mentionableMembers,
  onMentionsChange,
}) {
  const inputRef = useRef();
  const [messageText, setMessageText] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionList, setShowMentionList] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState([]);

  useEffect(() => {
    if (editTarget?.text !== undefined) {
      setMessageText(editTarget.text);
    }
  }, [editTarget]);
  
  useEffect(() => {
    onMentionsChange?.(selectedMentions);
  }, [selectedMentions, onMentionsChange]);

  // Handle file selection
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    setFileUpload(files);
  };

  // Remove a selected file
  const clearFileInput = (id) => {
    setFileUpload((prev) => prev.filter((f) => f.lastModified !== id));
  };

  // Handle send via Enter key or button click
  const handleSend = useCallback(async (e) => {
    if (e?.type === "keydown" && e.key !== "Enter") return;
    const text = messageText.trim();

    // Pass the text to parent's onSend handler
    if (text || fileUpload.length > 0) {
      const success = await onSend(text);
      if (success !== false) {
        setMessageText("");
        setSelectedMentions([]);
        setMentionQuery("");
        setShowMentionList(false);
      }
    }
  }, [messageText, fileUpload.length, onSend]);

  const extractMentionQuery = (text) => {
    const match = text.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    return match ? match[1] : null;
  };

  const filteredMembers = (mentionableMembers || []).filter((m) => {
    if (!mentionQuery && mentionQuery !== "") return false;
    return m.name.toLowerCase().includes(mentionQuery.toLowerCase());
  });

  const handleTextInput = (value) => {
    setMessageText(value);
    if (!isGroupChat) {
      setShowMentionList(false);
      return;
    }
    const query = extractMentionQuery(value);
    if (query === null) {
      setShowMentionList(false);
      return;
    }
    setMentionQuery(query);
    setShowMentionList(true);
  };

  const selectMention = (member) => {
    const updated = messageText.replace(/@([a-zA-Z0-9_]*)$/, `@${member.name} `);
    setMessageText(updated);
    setShowMentionList(false);
    setMentionQuery("");
    setSelectedMentions((prev) =>
      prev.some((m) => m.userId === member.userId) ? prev : [...prev, member]
    );
  };

  // If user is not a member, show restricted message
  if (!isMember) {
    return (
      <div className="w-full bg-gray-300 relative py-2" id="footer">
        <div className="rounded-xl mx-2 p-4 border bg-white">
          <div className="p-4 text-center text-red-500 font-semibold">
            You are no longer a member of this group.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-300 relative py-2" id="footer">
      <div className="rounded-xl mx-2 p-4 border bg-white">
        {replyTarget && (
          <div className="mb-2 rounded-lg bg-gray-100 px-3 py-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700 truncate">
                Replying to {replyTarget.senderName}
              </p>
              <p className="text-xs text-gray-700 truncate">
                {replyTarget.preview}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearReply}
              className="text-sm leading-none px-1 rounded hover:bg-gray-200"
              aria-label="Cancel reply"
            >
              ✕
            </button>
          </div>
        )}
        {editTarget && (
          <div className="mb-2 rounded-lg bg-amber-100 px-3 py-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-800 truncate">
                Editing message
              </p>
              <p className="text-xs text-amber-900 truncate">
                {editTarget.preview}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearEdit}
              className="text-sm leading-none px-1 rounded hover:bg-amber-200"
              aria-label="Cancel edit"
            >
              ✕
            </button>
          </div>
        )}

        {/* Selected files preview */}
        <div className="flex flex-row items-center flex-wrap">
          {fileUpload.map((file) => (
            <span
              key={file.lastModified}
              className="bg-gray-200 p-1 rounded-md mr-2 mb-2 text-sm flex w-fit cursor-pointer"
            >
              {file.name}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
                onClick={() => clearFileInput(file.lastModified)}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </span>
          ))}
        </div>

        {/* Input area */}
        <div className="relative flex flex-row items-center" ref={inputRef}>
          {isGroupChat && showMentionList && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 max-h-44 overflow-y-auto rounded-t-xl rounded-b-md border bg-white shadow-lg z-20">
              {filteredMembers.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-b last:border-b-0"
                  onClick={() => selectMention(member)}
                >
                  @{member.name}
                </button>
              ))}
            </div>
          )}
          {/* File attachment button */}
          <label htmlFor="fileInput" className="cursor-pointer ml-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
              />
            </svg>
          </label>
          <input
            type="file"
            id="fileInput"
            className="hidden"
            onChange={handleFileUpload}
            multiple
          />

          {/* Text input */}
          <input
            type="text"
            placeholder="Type a message..."
            className="rounded-md w-full h-4/5 ml-2 p-2 outline-none bg-transparent"
            onChange={onTyping}
            onKeyDown={handleSend}
            value={messageText}
            onInput={(e) => handleTextInput(e.currentTarget.value)}
          />

          {/* Send button */}
          <button
            id="sendBtn"
            className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-full ml-2 cursor-pointer"
            onClick={handleSend}
          >
            {editTarget ? "Save" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
