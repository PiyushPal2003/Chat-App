import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ForwardMessageModal({
  open,
  onOpenChange,
  chats = [],
  currentUserId,
  message,
  onForward,
  isForwarding,
}) {
  const [selectedChatIds, setSelectedChatIds] = useState([]);

  useEffect(() => {
    if (!open) {
      setSelectedChatIds([]);
    }
  }, [open]);

  const previewText = useMemo(() => {
    const raw = message?.message?.text || "";
    const cleaned = raw.replace("|Forwarded|", "").replace("|SystemGenerated|", "").trim();
    if (cleaned) return cleaned;
    if (message?.message?.url?.length) return "Attachment";
    return "";
  }, [message]);

  const toggleSelection = (chatId) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const getChatName = (chat) =>
    chat?.isGroupChat
      ? chat?.grpname
      : chat?.members?.find((m) => m._id !== currentUserId)?.name || "Chat";

  const getChatPhoto = (chat) => {
    if (chat?.isGroupChat) {
      return chat?.photo === "NA" ? "./assets/grp_img.jpg" : chat?.photo;
    }
    const other = chat?.members?.find((m) => m._id !== currentUserId);
    return other?.profilePhoto === "NA" ? "./assets/user_img.jpg" : other?.profilePhoto;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4">
        <DialogHeader>
          <DialogTitle className="text-base">Forward message</DialogTitle>
        </DialogHeader>

        {previewText && (
          <div className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-700">
            {previewText}
          </div>
        )}

        <div className="max-h-72 overflow-y-auto space-y-2">
          {chats.map((chat) => (
            <button
              key={chat._id}
              type="button"
              onClick={() => toggleSelection(chat._id)}
              className={`w-full flex items-center gap-2 rounded-lg border p-2 text-left ${
                selectedChatIds.includes(chat._id) ? "bg-blue-50 border-blue-300" : "bg-white"
              }`}
            >
              <img
                src={getChatPhoto(chat)}
                alt={getChatName(chat)}
                className="h-9 w-9 rounded-full object-cover"
              />
              <span className="text-sm truncate flex-1">{getChatName(chat)}</span>
              <input type="checkbox" readOnly checked={selectedChatIds.includes(chat._id)} />
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={selectedChatIds.length === 0 || isForwarding}
          onClick={() => onForward(selectedChatIds)}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isForwarding ? "Forwarding..." : `Forward (${selectedChatIds.length})`}
        </button>
      </DialogContent>
    </Dialog>
  );
}
