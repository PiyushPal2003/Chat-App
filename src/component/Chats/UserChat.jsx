import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getSocket } from "../Context/Socket";
import api, {
  useFetchChatQuery,
  useSendChatMutation,
  useLazyFetchMessagesQuery,
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

export default function UserChat({ currChatId, setLastMessage }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth);
  const { socket, typingStatus } = getSocket();
  const virtuosoRef = useRef(null);

  // RTK Query hooks
  const { data: chatMeta } = useFetchChatQuery(currChatId, { skip: !currChatId });
  const [fetchMessagesTrigger] = useLazyFetchMessagesQuery();
  const [sendChatMutation] = useSendChatMutation();

  // Build a lookup map: memberId -> {name, photo}
  const chatMembers = useMemo(() => {
    const map = {};
    chatMeta?.chat?.members?.forEach((m) => {
      map[m._id] = { name: m.name, photo: m.profilePhoto };
    });
    return map;
  }, [chatMeta]);

  // UI state
  const [openInfo, setOpenInfo] = useState(false);
  const [fileUpload, setFileUpload] = useState([]);

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

  }, []);

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
        setHasMore((resMessages.length || 0) >= 15);
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

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
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
        setHasMore((resMessages.length || 0) >= 15);
      })
      .catch((err) => console.error("Error fetching older messages:", err))
      .finally(() => setIsLoadingOlder(false));
  }, [currChatId, fetchMessagesTrigger, hasMore, isLoadingOlder, messages, prependMessagesWithVirtualIndex]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (messageText) => {
      if (!messageText && fileUpload.length === 0) return;
      // build form data
      const payload = new FormData();
      payload.append("senderId", user.id);
      // determine receivers (all other members)
      const receiverIdArray = chatMeta?.chat?.members
        ?.filter((m) => m._id !== user.id)
        .map((m) => m._id) || [];
      payload.append("receiverId", JSON.stringify(receiverIdArray));
      if (messageText) payload.append("message", messageText);
      for (const f of fileUpload) payload.append("files", f);
        
      const optimistic = {
        _id: "temp-" + Date.now(),
        message: {
          text: messageText ? messageText : undefined,
          url: fileUpload.length>0 ? fileUpload?.map((f)=>f.name) : undefined,
        },
        senderId: user.id,
        receiverId: receiverIdArray,
        conversationId: chatMeta?.chat?._id,
        timestamp: new Date().toISOString(),
        status: "pending"
      };
      addMessagesDedup([optimistic], {prepend : false});
      setLastMessage((prev)=> ({...prev, [currChatId]: {message: optimistic?.message.text || `${optimistic?.message.url.length} files`, time: chatListDateTime(optimistic.timestamp)} }));

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
      }
    },
    [sendChatMutation, currChatId, chatMeta, fileUpload, user, addMessagesDedup, setLastMessage]
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
        style={{ padding: '1rem' }}
        data={flattenedMessages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={flattenedMessages.length > 0 ? flattenedMessages.length - 1 : 0}
        startReached={handleStartReached}
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
              <div className="flex justify-center sticky top-0 z-10">
                <span
                  className="text-center font-semibold bg-[#665757a6] text-white my-3 rounded-full"
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.4rem" }}
                >
                  {convertDateToReadable(item.date)}
                </span>
              </div>
            );
          }
          
          // Message bubble
          return (
            <MessageBubble
              message={item}
              isMine={String(item.senderId) === String(user.id)}
              isGroupChat={chatMeta?.chat?.isGroupChat}
              senderInfo={chatMembers[item.senderId]}
            />
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