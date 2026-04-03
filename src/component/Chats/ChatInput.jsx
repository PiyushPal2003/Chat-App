import React, { useRef, useCallback } from "react";

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
  isMember 
}) {
  const inputRef = useRef();

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
  const handleSend = useCallback((e) => {
    let messageText = "";
    
    if (e?.type === "keydown" && e.key !== "Enter") return;
    
    if (e?.type === "keydown") {
      messageText = e.target.value.trim();
      e.target.value = "";
    } else if (e?.type === "click") {
      const input = inputRef.current?.querySelector('input[type="text"]');
      if (input) {
        messageText = input.value.trim();
        input.value = "";
      }
    }

    // Pass the text to parent's onSend handler
    if (messageText || fileUpload.length > 0) {
      onSend(messageText);
    }
  }, [fileUpload.length, onSend]);

  // If user is not a member, show restricted message
  if (!isMember) {
    return (
      <div className="w-full bg-gray-300 relative" id="footer">
        <div className="rounded-full p-4 border bg-white">
          <div className="p-4 text-center text-red-500 font-semibold">
            You are no longer a member of this group.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-300 relative" id="footer">
      <div className="rounded-full p-4 border bg-white">
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
        <div className="flex flex-row items-center" ref={inputRef}>
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
          />

          {/* Send button */}
          <button
            id="sendBtn"
            className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-full ml-2 cursor-pointer"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
