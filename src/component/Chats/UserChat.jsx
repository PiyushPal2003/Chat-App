import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getSocket } from "../Context/Socket";
import api, {
  useFetchChatQuery,
  useSendChatMutation,
  useForwardChatMutation,
  useEditMessageMutation,
  useLazyFetchMessagesQuery,
  useGetChatsQuery,
} from "../../Redux/apiRTK/api";
import { AnimatePresence } from "framer-motion";
import {
  chatListDateTime,
  groupMessagesByDate,
  convertDateToReadable,
} from "../../Utilities";
import { Spinner } from "@/components/ui/spinner";
import { Virtuoso } from "react-virtuoso";

// Sub-components
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import ChatInfo from "./ChatInfo";
import ForwardMessageModal from "./ForwardMessageModal";

export default function UserChat({ currChatId, setLastMessage }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth);
  const { socket, typingStatus } = getSocket();
  const virtuosoRef = useRef(null);

  // RTK Query hooks
  const { data: chatMeta } = useFetchChatQuery(currChatId, { skip: !currChatId });
  const [fetchMessagesTrigger] = useLazyFetchMessagesQuery();
  const [sendChatMutation] = useSendChatMutation();
  const [forwardChatMutation] = useForwardChatMutation();
  const [editMessageMutation] = useEditMessageMutation();
  const { data: chatsData } = useGetChatsQuery(user?.id, { skip: !user?.id });

  // Build a lookup map: memberId -> {name, photo}
  const chatMembers = useMemo(() => {
    const map = {};
    chatMeta?.chat?.members?.forEach((m) => {
      map[m._id] = { name: m.name, photo: m.profilePhoto };
    });
    return map;
  }, [chatMeta]);
  const mentionableMembers = useMemo(
    () =>
      (chatMeta?.chat?.members || [])
        .filter((m) => String(m._id) !== String(user.id))
        .map((m) => ({ userId: m._id, name: m.name })),
    [chatMeta, user.id]
  );

  // UI state
  const [openInfo, setOpenInfo] = useState(false);
  const [fileUpload, setFileUpload] = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardSourceMessage, setForwardSourceMessage] = useState(null);
  const [isForwarding, setIsForwarding] = useState(false);
  const [pendingMentions, setPendingMentions] = useState([]);

  // Messages state
  const [messages, setMessages] = useState([]);
  const messageIdsRef = useRef(new Set());

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Virtualization: firstItemIndex for prepending
  const START_INDEX = 10000;
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

  // Flatten messages for Virtuoso (date headers + messages in flat array)
  const flattenedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    const grouped = groupMessagesByDate(messages);
    if (!grouped) return [];
    
    const flat = [];
    Object.keys(grouped).forEach(date => {
      flat.push({ _type: 'header', date, _id: `header-${date}` });
      grouped[date].forEach(msg => {
        flat.push({ _type: 'message', ...msg });
      });
    });
    
    return flat;
  }, [messages]);

  // ─────────────────────────────────────────────────────────────────────────────
  // MESSAGE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  const addMessagesDedup = useCallback((incoming = [], { prepend = false } = {}) => {
    // incoming assumed ascending (oldest->newest)
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    setMessages((prev) => {
      if (prepend) {
        const toAdd = [];
        for (const msg of incoming) {
          if (!messageIdsRef.current.has(msg._id) && (msg.receiverId.includes(user.id) || msg.senderId === user.id)) {
            messageIdsRef.current.add(msg._id);
            toAdd.push(msg);
          }
        }
        return [...toAdd, ...prev];
      } 
      else {
        const out = [...prev];
        for (const msg of incoming) {
          if (!messageIdsRef.current.has(msg._id) && (msg.receiverId.includes(user.id) || msg.senderId === user.id)) {
            messageIdsRef.current.add(msg._id);
            out.push(msg);
          }
        }
        return out;
      }
    });

  }, [user.id]);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────

  // Initial load & chat change
  useEffect(() => {
    if (!currChatId) return;
    setMessages([]);
    messageIdsRef.current = new Set();
    setHasMore(false);
    setFirstItemIndex(START_INDEX);

    fetchMessagesTrigger({ id: currChatId })
      .unwrap()
      .then((res) => {
        const resMessages = Array.isArray(res?.messages) ? res.messages : [];
        addMessagesDedup(resMessages, { prepend: false });
        setHasMore(Boolean(res?.hasMore ?? (resMessages.length || 0) >= 15));
      })
      .catch((err) => console.error("Failed to fetch messages:", err));
  }, [currChatId, addMessagesDedup, fetchMessagesTrigger]);

  // Socket: listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      dispatch(api.util.invalidateTags(['Chats']));
      if (String(msg.conversationId) === String(currChatId)) {
        addMessagesDedup([msg], { prepend: false });
      }
    };
    const handleMessageEdited = (msg) => {
      dispatch(api.util.invalidateTags(['Chats']));
      if (String(msg.conversationId) === String(currChatId)) {
        setMessages((prev) => prev.map((m) => (String(m._id) === String(msg._id) ? msg : m)));
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageEdited", handleMessageEdited);
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageEdited", handleMessageEdited);
    };
  }, [socket, currChatId, addMessagesDedup, dispatch]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────────────────────────────────────

  const prependMessagesWithVirtualIndex = useCallback((incoming) => {
    if (!incoming || incoming.length === 0) return;
    
    // Calculate how many new flat items will be created
    // We need to check which dates are new vs existing
    const existingDates = new Set(messages.map(m => new Date(m.timestamp).toDateString()));
    const incomingDates = new Set(incoming.map(m => new Date(m.timestamp).toDateString()));
    
    // Count new headers (dates that don't exist in current messages)
    let newHeaderCount = 0;
    incomingDates.forEach(date => {
      if (!existingDates.has(date)) {
        newHeaderCount++;
      }
    });
    
    // Total new flat items = new messages + new headers
    const newFlatItemCount = incoming.length + newHeaderCount;
    
    // Decrease firstItemIndex so existing items keep their virtual indices
    setFirstItemIndex(prev => prev - newFlatItemCount);
    
    // Add messages to state
    addMessagesDedup(incoming, { prepend: true });
  }, [messages, addMessagesDedup]);

  const handleStartReached = useCallback(() => {
    if (!hasMore || isLoadingOlder || messages.length === 0) return;
    
    setIsLoadingOlder(true);
    const earliestId = messages[0]?._id;
    
    fetchMessagesTrigger({ id: currChatId, lastMessageId: earliestId })
      .unwrap()
      .then((res) => {
        const resMessages = Array.isArray(res?.messages) ? res.messages : [];
        prependMessagesWithVirtualIndex(resMessages);
        setHasMore(Boolean(res?.hasMore ?? (resMessages.length || 0) >= 15));
      })
      .catch((err) => console.error("Error fetching older messages:", err))
      .finally(() => setIsLoadingOlder(false));
  }, [currChatId, fetchMessagesTrigger, hasMore, isLoadingOlder, messages, prependMessagesWithVirtualIndex]);

  const handleAtTopStateChange = useCallback((atTop) => {
    if (atTop) {
      handleStartReached();
    }
  }, [handleStartReached]);

  const handleReplyAction = useCallback((message) => {
    const senderName = String(message?.senderId) === String(user.id)
      ? "You"
      : chatMembers[message?.senderId]?.name || "User";
    const attachmentName = message?.message?.url?.[0]
      ? decodeURIComponent(message.message.url[0].split("_").pop() || "Attachment")
      : null;
    const preview = (message?.message?.text || "").trim()
      || attachmentName
      || "Message";

    setReplyTarget({
      messageId: message?._id,
      senderName,
      preview,
    });
  }, [chatMembers, user.id]);

  const handleForwardAction = useCallback((message) => {
    setForwardSourceMessage(message);
    setForwardModalOpen(true);
  }, []);

  const handleForwardToChats = useCallback(async (selectedChatIds) => {
    if (!forwardSourceMessage || !selectedChatIds?.length) return;
    setIsForwarding(true);

    try {
      await forwardChatMutation({
        sourceMessageId: forwardSourceMessage._id,
        targetConversationIds: selectedChatIds,
      }).unwrap();

      setForwardModalOpen(false);
      setForwardSourceMessage(null);
    } catch (error) {
      console.error("Forward failed:", error);
    } finally {
      setIsForwarding(false);
    }
  }, [forwardSourceMessage, forwardChatMutation]);

  const handleEditAction = useCallback((message) => {
    if (String(message?.senderId) !== String(user.id)) return;
    const ageMs = Date.now() - new Date(message?.timestamp).getTime();
    const canEditWithinWindow = ageMs <= 15 * 60 * 1000;
    const hasAttachment = Array.isArray(message?.message?.url) && message.message.url.length > 0;
    const isForwarded = Boolean(message?.forwardInfo?.isForwarded) || message?.message?.text?.includes?.("|Forwarded|");
    if (!canEditWithinWindow || hasAttachment || isForwarded) return;
    const sourceText = (message?.message?.text || "")
      .replace("|Forwarded|", "")
      .trim();

    setEditTarget({
      messageId: message?._id,
      text: sourceText,
      preview: sourceText || "Message",
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (messageText) => {
      if (!messageText && fileUpload.length === 0) return false;

      if (editTarget?.messageId) {
        try {
          const res = await editMessageMutation({
            messageId: editTarget.messageId,
            message: messageText,
          }).unwrap();
          const editedMsg = res.chat;
          setMessages((prev) =>
            prev.map((m) => (String(m._id) === String(editedMsg._id) ? editedMsg : m))
          );
          setLastMessage((prev) => ({
            ...prev,
            [currChatId]: {
              message: editedMsg?.message?.text || prev?.[currChatId]?.message || "",
              time: chatListDateTime(editedMsg?.timestamp || new Date().toISOString()),
              isEdited: Boolean(editedMsg?.isEdited),
            },
          }));
          setEditTarget(null);
          return true;
        } catch (err) {
          console.error("editMessage Failed:", err);
          return false;
        }
      }
      // build form data
      const payload = new FormData();
      payload.append("senderId", user.id);
      // determine receivers (all other members)
      const receiverIdArray = chatMeta?.chat?.members
        ?.filter((m) => m._id !== user.id)
        .map((m) => m._id) || [];
      payload.append("receiverId", JSON.stringify(receiverIdArray));
      if (messageText) payload.append("message", messageText);
      if (replyTarget?.messageId) payload.append("replyToId", replyTarget.messageId);
      if (pendingMentions.length > 0) {
        payload.append("mentions", JSON.stringify(pendingMentions.map((m) => m.userId)));
      }
      for (const f of fileUpload) payload.append("files", f);
         
      const optimistic = {
        _id: "temp-" + Date.now(),
        message: {
          text: messageText ? messageText : undefined,
          url: fileUpload.length>0 ? fileUpload?.map((f)=>f.name) : undefined,
        },
        replyTo: replyTarget?.messageId
          ? {
              messageId: replyTarget.messageId,
              text: replyTarget.preview || "Message",
              senderName: replyTarget.senderName || "User",
            }
          : undefined,
        mentions: pendingMentions,
        senderId: user.id,
        receiverId: receiverIdArray,
        conversationId: chatMeta?.chat?._id,
        timestamp: new Date().toISOString(),
        isEdited: false,
        status: "pending"
      };
      addMessagesDedup([optimistic], {prepend : false});
      setLastMessage((prev)=> ({...prev, [currChatId]: {message: optimistic?.message.text || `${optimistic?.message.url.length} files`, time: chatListDateTime(optimistic.timestamp), isEdited: false} }));

      try {
        const res = await sendChatMutation({ data: payload, id: currChatId }).unwrap();
        const sentMsg = res.chat;
        // append locally
        // addMessagesDedup([sentMsg], { prepend: false });
        // patch RTK cache (similar to socket handler)

        // setLastMessage((prev)=> ({...prev, [currChatId]: sentMsg}));

        setMessages((prev) => {
          const idx = prev.findIndex((m) => m._id === optimistic._id);
          if (idx !== -1) {
            const newArr = [...prev];
            newArr[idx] = sentMsg;
            return newArr;
          }
          return prev;
        });
        setFileUpload([]);
        setReplyTarget(null);
        setPendingMentions([]);
        return true;
      } catch (err) {
          console.error('sendChat Failed:', err);
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m._id === optimistic._id);
            if (idx !== -1) {
              const newArr = [...prev];
              newArr[idx].status = "failed";
              return newArr;
            }
            return prev;
          });
          return false;
      }
    },
    [sendChatMutation, editMessageMutation, currChatId, chatMeta, fileUpload, user, addMessagesDedup, setLastMessage, editTarget, replyTarget, pendingMentions]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPING INDICATOR
  // ─────────────────────────────────────────────────────────────────────────────

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  
  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { chatId: currChatId, userId: user.id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("stopTyping", { chatId: currChatId, userId: user.id });
    }, 1500);
  }, [socket, currChatId, user.id]);

  // Check if current user is still a member of this chat
  const isMember = chatMeta?.chat?.members?.some((m) => m._id === user.id);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col border justify-between overflow-x-hidden">
      {/* Header */}
      <ChatHeader
        chatMeta={chatMeta}
        user={user}
        typingStatus={typingStatus}
        currChatId={currChatId}
        chatMembers={chatMembers}
        onInfoClick={() => setOpenInfo((p) => !p)}
      />

      {/* Messages - Virtualized */}
      <Virtuoso
        ref={virtuosoRef}
        className="bg-gray-300 flex-1"
        data={flattenedMessages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={flattenedMessages.length > 0 ? flattenedMessages.length - 1 : 0}
        atTopThreshold={120}
        atTopStateChange={handleAtTopStateChange}
        followOutput="smooth"
        components={{
          Header: () => isLoadingOlder ? (
            <div className="flex justify-center py-4">
              <Spinner className="size-8" />
            </div>
          ) : null
        }}
        itemContent={(index, item) => {
          // Date header
          if (item._type === 'header') {
            return (
              <div className="px-4">
                <div className="flex justify-center sticky top-0 z-10">
                  <span
                    className="text-center font-semibold bg-[#665757a6] text-white my-3 rounded-full"
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.4rem" }}
                  >
                    {convertDateToReadable(item.date)}
                  </span>
                </div>
              </div>
            );
          }
          
          // Message bubble
          return (
            <div className="px-4">
              <MessageBubble
                message={item}
                isMine={String(item.senderId) === String(user.id)}
                canEdit={
                  String(item.senderId) === String(user.id) &&
                  (Date.now() - new Date(item.timestamp).getTime() <= 15 * 60 * 1000) &&
                  !(Array.isArray(item?.message?.url) && item.message.url.length > 0) &&
                  !(Boolean(item?.forwardInfo?.isForwarded) || item?.message?.text?.includes?.("|Forwarded|"))
                }
                isGroupChat={chatMeta?.chat?.isGroupChat}
                senderInfo={chatMembers[item.senderId]}
                chatMembers={chatMembers}
                currentUserId={user.id}
                onReply={handleReplyAction}
                onForward={handleForwardAction}
                onEdit={handleEditAction}
              />
            </div>
          );
        }}
      />

      {/* Input */}
      <ChatInput
        fileUpload={fileUpload}
        setFileUpload={setFileUpload}
        onSend={handleSend}
        onTyping={handleTyping}
        isMember={isMember}
        isGroupChat={Boolean(chatMeta?.chat?.isGroupChat)}
        mentionableMembers={mentionableMembers}
        onMentionsChange={setPendingMentions}
        replyTarget={replyTarget}
        onClearReply={() => setReplyTarget(null)}
        editTarget={editTarget}
        onClearEdit={() => setEditTarget(null)}
      />

      <ForwardMessageModal
        open={forwardModalOpen}
        onOpenChange={setForwardModalOpen}
        chats={chatsData?.chats || []}
        currentUserId={user.id}
        message={forwardSourceMessage}
        onForward={handleForwardToChats}
        isForwarding={isForwarding}
      />

      {/* Chat Info Sidebar */}
      <AnimatePresence>
        {openInfo && (
          <ChatInfo
            data={chatMeta}
            user={user}
            open={openInfo}
            setOpen={setOpenInfo}
            allMessages={messages}
            setAllMessages={setMessages}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
