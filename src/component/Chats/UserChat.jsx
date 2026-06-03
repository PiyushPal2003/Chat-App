import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useSelector, useDispatch } from "react-redux";
import { getSocket } from "../Context/Socket";
import api, {
  useFetchChatQuery,
  useSendChatMutation,
  useForwardChatMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useLazyFetchMessagesQuery,
  useGetChatsQuery,
} from "../../Redux/apiRTK/api";
import {
  chatListDateTime,
  groupMessagesByDate,
  convertDateToReadable,
} from "../../Utilities";
import { Spinner } from "@/components/ui/spinner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Virtuoso } from "react-virtuoso";

// Sub-components
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import ChatInfo from "./ChatInfo";
import ForwardMessageModal from "./ForwardMessageModal";
import toast from "react-hot-toast";

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
  const [deleteMessageMutation] = useDeleteMessageMutation();
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
  const didMountVirtuosoRef = useRef(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [hasMoreBottom, setHasMoreBottom] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Virtualization: firstItemIndex for prepending
  const START_INDEX = 10000;
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  const visibleRangeRef = useRef({ startIndex: START_INDEX, endIndex: START_INDEX });
  // const lastSentSeenRef = useRef(null);
  const lastSentSeenRef = useRef(null);
  const pendingSeenRef = useRef(null);
  const seenDebounceRef = useRef(null);
  const SEEN_DEBOUNCE_MS = 600;

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
    // lastSentSeenRef.current = chatMeta?.chat?.readState[user.id]?.lastSeenMessageId;

    // requestAnimationFrame(() => {
    //   virtuosoRef.current?.scrollToIndex({
    //     index: firstItemIndex + flat.length - 1,
    //     align: "start",
    //     behavior: "auto",
    //   });
    // });
    
    return flat;
  }, [messages]);

  const messageIndexMap = useMemo(() => {
    const map = new Map();
    messages.forEach((m, idx) => {
      if (m?._id) map.set(String(m._id), idx);
    });
    return map;
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
    setHasMoreBottom(false);
    setFirstItemIndex(START_INDEX);
    // lastSentSeenRef.current = null;
    pendingSeenRef.current = null;
    if (seenDebounceRef.current) {
      clearTimeout(seenDebounceRef.current);
      seenDebounceRef.current = null;
    }

    fetchMessagesTrigger({ id: currChatId })
      .unwrap()
      .then((res) => {
        const resMessages = Array.isArray(res?.messages) ? res.messages : [];
        addMessagesDedup(resMessages, { prepend: false });
        setHasMore(Boolean(res?.hasMore ?? (resMessages.length || 0) >= 15));
        setHasMoreBottom(Boolean(res?.hasMoreBottom ?? (resMessages.length || 0) >= 15));
      })
      .catch((err) => console.error("Failed to fetch messages:", err));
  }, [currChatId, addMessagesDedup, fetchMessagesTrigger]);

  useEffect(() => {
    if (flattenedMessages.length > 0) {
      const t = setTimeout(() => { didMountVirtuosoRef.current = true; }, 0);
      return () => clearTimeout(t);
    }
  }, [flattenedMessages.length]);

  // Socket: listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      dispatch(api.util.invalidateTags(['Chats']));
      if (String(msg.conversationId) === String(currChatId)) {
        addMessagesDedup([msg], { prepend: false });
      }
    };
    const handleMessageSeen = (data) => {
      if (String(data.conversationId) !== String(currChatId)) return;

      dispatch(
        api.util.updateQueryData("fetchChat", currChatId, (draft) => {
          if (!draft?.chat) return;

          if (!draft.chat.readState) draft.chat.readState = {};
          draft.chat.readState[String(data.readerId)] = {
            lastSeenMessageId: data.lastSeenMessageId,
            seenAt: data.seenAt,
          };
        })
      );
    };
    const handleMessageEdited = (msg) => {
      dispatch(api.util.invalidateTags(['Chats']));
      if (String(msg.conversationId) === String(currChatId)) {
        setMessages((prev) => prev.map((m) => (String(m._id) === String(msg._id) ? msg : m)));
      }
    };
    const handleMessageDeleted = (payload) => {
      dispatch(api.util.invalidateTags(['Chats']));
      const conversationId = payload?.conversationId || payload?.chat?.conversationId;
      if (conversationId && String(conversationId) !== String(currChatId)) return;

      if (payload?.chat?._id) {
        setMessages((prev) =>
          prev.map((m) => (String(m._id) === String(payload.chat._id) ? payload.chat : m))
        );
        return;
      }
      if (payload?.messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m._id) === String(payload.messageId)
              ? {
                  ...m,
                  deleted: {
                    ...(m.deleted || {}),
                    status: "everyone",
                    text: "This message was deleted for everyone",
                  },
                }
              : m
          )
        );
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessageSeen);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessageSeen);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, currChatId, addMessagesDedup, dispatch]);

  useEffect(() => {
    if (chatMeta) {
      lastSentSeenRef.current =
        chatMeta.chat.readState[user.id]?.lastSeenMessageId;
    }
  }, [chatMeta, user.id]);

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
    const nextFirstIndex = firstItemIndex - newFlatItemCount;

    // Decrease firstItemIndex so existing items keep their virtual indices.
    console.log(nextFirstIndex, firstItemIndex, newFlatItemCount);
    setFirstItemIndex(nextFirstIndex);
    
    // Add messages to state
    addMessagesDedup(incoming, { prepend: true });
  }, [messages, addMessagesDedup, firstItemIndex]);

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

  const handleBottomReached = useCallback(() => {
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
    if (!didMountVirtuosoRef.current) return;
    if (atTop) {
      handleStartReached();
    }
  }, [handleStartReached]);

  const handleAtBottomStateChange = useCallback((atBottom) => {
    // if (atBottom) {
    //   handleBottomReached();
    // }
  }, [handleBottomReached]);

  const handleRangeChanged = useCallback((range) => {
    visibleRangeRef.current = range;
    if (!socket || !currChatId || !flattenedMessages.length) return;

    const rawStart = (range?.startIndex ?? 0) - firstItemIndex;
    const rawEnd = (range?.endIndex ?? 0) - firstItemIndex;
    const startIndex = Math.max(0, rawStart);
    const endIndex = Math.min(flattenedMessages.length - 1, rawEnd);

    if (endIndex < startIndex){
      console.log("Invalid range for seen messages. Range:", { startIndex, endIndex });
      return;
    }

    let candidate = null;
    for (let i = endIndex; i >= startIndex; i -= 1) {
      const item = flattenedMessages[i];
      if (item?._type === "message" && String(item.senderId) !== String(user.id)) {
        candidate = item;
        break;
      }
    }
    if (!candidate?._id){
      console.log("No valid candidate for seen. Range:", { startIndex, endIndex }, "Items in range:", flattenedMessages.slice(startIndex, endIndex + 1));
      return;
    }

    const candidateIndex = messageIndexMap.get(String(candidate._id));
    if (candidateIndex == null) return;
    const lastIndex = lastSentSeenRef.current ?? -1;
    if (candidate._id <= lastIndex){
      console.log("No new message to mark seen. Candidate id:", candidate._id, "Last sent seen index:", lastIndex);
      return;
    }

    console.log("Marking message as seen. Candidate ID:", candidate._id, "Last sent seen index:", lastIndex);
    pendingSeenRef.current = { messageId: candidate._id, index: candidateIndex };
    if (seenDebounceRef.current) clearTimeout(seenDebounceRef.current);
    seenDebounceRef.current = setTimeout(() => {
      const pending = pendingSeenRef.current;
      if (!pending?.messageId) return;
      socket.emit("markSeen", { convoId: currChatId, messageId: pending.messageId });
      lastSentSeenRef.current = pending.messageId;
      pendingSeenRef.current = null;
    }, SEEN_DEBOUNCE_MS);
  }, [socket, currChatId, flattenedMessages, messageIndexMap, user.id, firstItemIndex]);

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

  const handleDeleteAction = useCallback(async (message, status) => {
    const ageMs = Date.now() - new Date(message?.timestamp).getTime();
    const canDeleteWithinWindow = ageMs <= 15 * 60 * 1000;

    if(!canDeleteWithinWindow && status !== "me") return;

    const messageId = message._id;

    const result = await Swal.fire({
      title: "Delete Message" + (status === "everyone" ? " for Everyone" : " for You"),
      text: "Are you sure you want to delete this message?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete"
    });
    if (!result.isConfirmed) return;

    try {
      const res = await deleteMessageMutation({ messageId, status }).unwrap();
      if (res?.chat?._id) {
        setMessages((prev) =>
          prev.map((m) => (String(m._id) === String(res.chat._id) ? res.chat : m))
        );
      }
      toast.success("Message deleted");
    } catch (err) {
      console.error("deleteMessage Failed:", err);
      toast.error(err?.data?.message || "Failed to delete message");
    }
  }, [deleteMessageMutation]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (messageText) => {
      if (!messageText && fileUpload.length === 0) return false;

      if (editTarget?.messageId) {
        try {
          const payload = {
            messageId: editTarget.messageId,
            message: messageText,
          };
          if (pendingMentions.length > 0) {
            payload.mentions = JSON.stringify(pendingMentions.map((m) => m.userId));
          }
          const res = await editMessageMutation(payload).unwrap();
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
    <div className="relative w-full h-full flex flex-col border-l justify-between overflow-x-hidden">
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
        // initialTopMostItemIndex={flattenedMessages.length > 0 ? flattenedMessages.length - 1 : 0}
        atTopThreshold={120}
        atTopStateChange={handleAtTopStateChange}
        atBottomThreshold={120}
        atBottomStateChange={handleAtBottomStateChange}
        rangeChanged={handleRangeChanged}
        followOutput="smooth"
        components={{
          Header: () => isLoadingOlder ? (
            <div className="flex justify-center py-4">
              <Spinner className="size-8" />
            </div>
          ) : null,

          // Footer: () => <div style={{ height: 40 }} />
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
                canDelete={
                  (String(item.senderId) === String(user.id) &&
                  (Date.now() - new Date(item.timestamp).getTime() <= 15 * 60 * 1000))
                  ||
                  (chatMeta?.chat?.isGroupChat && (chatMeta?.chat?.admin || []).some((id) => String(id) === String(user.id)))
                }
                isGroupChat={chatMeta?.chat?.isGroupChat}
                senderInfo={chatMembers[item.senderId]}
                chatMembers={chatMembers}
                currentUserId={user.id}
                onReply={handleReplyAction}
                onForward={handleForwardAction}
                onEdit={handleEditAction}
                onDelete={handleDeleteAction}
                readState={chatMeta?.chat?.readState}
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
      <Sheet open={openInfo} onOpenChange={setOpenInfo}>
        <SheetContent side="right" className="w-[88%] md:w-[420px] p-0 sm:max-w-none [&>button]:hidden">
          <ChatInfo
            data={chatMeta}
            user={user}
            open={openInfo}
            setOpen={setOpenInfo}
            allMessages={messages}
            setAllMessages={setMessages}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
