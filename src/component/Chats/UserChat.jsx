import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getSocket } from "../Context/Socket";
import api, {
  useFetchChatQuery,
  useSendChatMutation,
  useLazyFetchMessagesQuery,
} from "../../Redux/apiRTK/api";
import { AnimatePresence, motion } from "framer-motion";
import useElementInView from "../../custom_hooks/Intersection";
import {
  chatListDateTime,
  dateFormat,
  groupMessagesByDate,
  convertDateToReadable,
} from "../../Utilities";
import ChatInfo from "./ChatInfo";

/**
 * Assumptions from your backend:
 * - fetchMessages returns `messages` as an array in ascending order (older -> newer)
 * - each message object shape (example) matches the mongo doc you shared:
 *   {
 *     _id: "6900f2911a596065dba63288",
 *     conversationId: "68c1c4c4f4dd5931aacfe412",
 *     senderId: "68ab067d50edac6392f3909e",
 *     receiverId: ["6897687e5c882cf7692a1767"], // array for group
 *     message: { text: "hello", url: [] },
 *     timestamp: "2025-10-28T16:42:57.970Z"
 *   }
 */

export default function UserChat({ currChatId, setLastMessage }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth);
  const { socket, typingStatus } = getSocket();
  const chatContainerRef = useRef(null);
  console.log(typingStatus);

  // RTK Query hooks
  const {
    data: chatMeta, isLoading: chatMetaLoading, isSuccess: chatMetaSuccess} = useFetchChatQuery(currChatId, { skip: !currChatId });
  const [fetchMessagesTrigger, { isFetching: fetchingMessages }] = useLazyFetchMessagesQuery();
  const [sendChatMutation, { isLoading: sending }] = useSendChatMutation();

  const chatMembers = {};
  chatMeta?.chat?.members.map((m) =>chatMembers[m._id] = {name:m.name, photo:m.profilePhoto});

  // UI bits
  const [openInfo, setOpenInfo] = useState(false);
  const [fileUpload, setFileUpload] = useState([]);
  const inputRef = useRef();

  // flat list of messages (ascending order oldest -> newest)
  const [messages, setMessages] = useState([]);

  // set of message ids to avoid duplicates
  const messageIdsRef = useRef(new Set());

  // pagination state
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Memoized grouped messages shape used for rendering (date -> array)
  const allMessagesGrouped = useMemo(() => 
                                groupMessagesByDate(messages),
                              [messages]);

  console.log(openInfo);


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

  // Initial load & chat change
  useEffect(() => {
    if (!currChatId) return;
    setMessages([]);
    messageIdsRef.current = new Set();
    setHasMore(false);

    fetchMessagesTrigger({ id: currChatId })
      .unwrap()
      .then((res) => {
        // res.messages comes ascending (older -> newer)
        const resMessages = Array.isArray(res?.messages) ? res.messages : [];
        addMessagesDedup(resMessages, { prepend: false });
        setHasMore((resMessages.length || 0) >= 8);
        // record earliest id for pagination if exists
        // scroll to bottom after first paint
        requestAnimationFrame(() => scrollToBottom());
      })
      .catch((err) => {
        console.error("Failed to fetch messages:", err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currChatId]);

  // Socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      console.log("Socket newMessage received:", msg);
      
      // 2) If the message belongs to the current chat, append locally
      dispatch(api.util.invalidateTags(['Chats']));
      if (String(msg.conversationId) === String(currChatId)) {
        console.log(msg);
        addMessagesDedup([msg], { prepend: false });
        // scroll to bottom only if user is near bottom already
        const el = chatContainerRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
        if (nearBottom) {
          requestAnimationFrame(() => scrollToBottom());
        }
      } else {
        console.log("Message for another chat:", msg.conversationId);
        // TODO: optionally show toast / badge for other chats
        // e.g., toast('New message in another chat')
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, currChatId, addMessagesDedup]);


  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // file upload helpers
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    setFileUpload(files);
  };
  const clearFileInput = (id) => {
    setFileUpload((prev) => prev.filter((f) => f.lastModified !== id));
  };

  // Preserve scroll when prepending older messages
  const prependMessagesPreserveScroll = useCallback((incoming) => {
    const el = chatContainerRef.current;
    if (!el) {
      addMessagesDedup(incoming, { prepend: true });
      return;
    }
    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;
    addMessagesDedup(incoming, { prepend: true });

    // wait for DOM to update (next tick)
    requestAnimationFrame(() => {
      // new scrollHeight - old scrollHeight + old scrollTop keeps view stable
      const newScrollHeight = el.scrollHeight;
      el.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
    });
  }, [addMessagesDedup]);

  // Pagination: load older messages
  const loadOlder = useCallback(() => {
    if (!hasMore || isLoadingOlder || messages.length === 0) return;
    setIsLoadingOlder(true);
    const earliestId = messages[0]?._id;
    fetchMessagesTrigger({ id: currChatId, lastMessageId: earliestId })
      .unwrap()
      .then((res) => {
        const resMessages = Array.isArray(res?.messages) ? res.messages : [];
        // server returns older batch ascending; prepend them preserving scroll
        prependMessagesPreserveScroll(resMessages);

        setHasMore((resMessages.length || 0) >= 8);
      })
      .catch((err) => {
        console.error("Error fetching older messages:", err);
      })
      .finally(() => setIsLoadingOlder(false));
  }, [currChatId, fetchMessagesTrigger, hasMore, isLoadingOlder, messages, prependMessagesPreserveScroll]);

  // attach scroll listener to chat container
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    let throttle = false;
    const onScroll = () => {
      if (throttle) return;
      throttle = true;
      setTimeout(() => (throttle = false), 150);
      if (el.scrollTop < 120) {
        // near top -> load older
        loadOlder();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadOlder]);

  // Send a message
  const handleSend = useCallback(
    async (e) => {
      let messageText = "";
      if (e?.type === "keydown" && e.key !== "Enter") return;
      if (e?.type === "keydown") {
        messageText = e.target.value.trim();
        e.target.value = "";
      } else if (e?.type === "click") {
        // find text input from ref
        const input = inputRef.current?.querySelector('input[type="text"]');
        if (input) {
          messageText = input.value.trim();
          input.value = "";
        }
      }

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
          if(idx !== -1){
            const newArr = [...prev];
            newArr[idx] = sentMsg;
            return newArr;
          }
        });
        // clear file uploads & after sending, scroll to bottom
        setFileUpload([]);
        requestAnimationFrame(() => scrollToBottom());
      } 
      catch (err) {
        console.error("sendChat failed", err);
        optimistic.status = 'failed';

        // setMessages((prev) => {
        //   const idx = prev.findIndex((m) => m._id === optimistic._id);
        //   if(idx !== -1){
        //     const newArr = [...prev];
        //     newArr[idx].status = 'failed';
        //     return newArr;
        //   }
        // });

      }
    },
    [sendChatMutation, currChatId, chatMeta, fileUpload, user, addMessagesDedup, dispatch, scrollToBottom]
  );

  const groupOnlineCount = useMemo(() => {
    return chatMeta?.chat?.members?.reduce(
        (acc, member) => acc + (member._id !== user.id && user.onlineUsers[member._id] ? 1 : 0),0)
  }, [chatMeta, user.onlineUsers]);

  let timeout;
  let typing = false;
  const handleTyping = useCallback((e) => {
    if(!typing){
      typing = true;
      socket.emit("typing", { chatId: currChatId, userId: user.id });
    }

    timeout && clearTimeout(timeout);
    timeout = setTimeout(() => {
      typing = false;
      socket.emit("stopTyping", { chatId: currChatId, userId: user.id });
    }, 1500);

  }, []);


  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col border justify-between overflow-x-hidden">
      {/* header */}
      <div className="w-full h-16 border flex flex-row items-center" id="header">
        <div className="w-full h-full flex flex-row items-center">
          <img
            src={
              chatMeta?.chat?.isGroupChat
                ? chatMeta?.chat?.photo === "NA"
                  ? "./assets/grp_img.jpg"
                  : chatMeta?.chat?.photo
                : chatMeta?.chat?.members?.find((f) => f._id !== user.id)?.profilePhoto === "NA"
                ? "./assets/user_img.jpg"
                : chatMeta?.chat?.members?.find((f) => f._id !== user.id)?.profilePhoto
            }
            className="rounded-full object-cover h-4/5"
            style={{ aspectRatio: "1/1" }}
            alt="chat avatar"
          />
          <div>
            <h1 className="font-medium text-lg ml-2">
              {chatMeta?.chat?.isGroupChat
                ? chatMeta?.chat?.grpname
                : chatMeta?.chat?.members?.filter((member) => member._id !== user.id)[0]?.name}
            </h1>
            <h1 className="text-sm ml-2">
              
              {/* online count */}
              {chatMeta?.chat?.isGroupChat ? (
                (() => {
                  const onlineCount = groupOnlineCount;
                  const usersTyping = typingStatus?.[currChatId] || [];

                  return usersTyping.length > 0 ? (
                    <span className="text-[0.8rem] text-blue-500">
                      {chatMembers[usersTyping[0]]?.name}{" "}
                      {usersTyping.length > 1 ? `and ${usersTyping.length - 1} others ` : ""}
                      typing...
                    </span>
                  ) : (
                    <>
                      {onlineCount > 0 ? (
                        <span className="text-[0.8rem] text-green-500">
                          {onlineCount} member{onlineCount > 1 ? "s" : ""} online
                        </span>
                      ) : (
                        <span className="text-[0.8rem] text-red-500">
                          No members online
                        </span>
                      )}
                    </>
                  );
                })()
              ) : user.onlineUsers[
                  chatMeta?.chat?.members?.filter((m) => m._id !== user.id)[0]?._id
                ] ? (
                <span className="text-[0.7rem] text-green-500">🟢 Online</span>
              ) : (
                <span className="text-[0.7rem] text-red-500">🔴 Offline</span>
              )}


            </h1>
            
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6 mr-4 cursor-pointer chatinfo-icon"
          onClick={() => setOpenInfo((p) => {
            return !p})}
          aria-label="Open chat settings"
          role="button"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      </div>

      {/* messages container */}
      <div className="bg-gray-300 flex-1 p-4 overflow-y-auto" ref={chatContainerRef}>
        {/* optionally show a loading indicator at top when fetching older */}
        {isLoadingOlder && <div className="text-center mb-2">Loading older messages...</div>}

        {/* grouped rendering */}
        {allMessagesGrouped && Object.keys(allMessagesGrouped).map((date) => (
          <div key={date} className="relative">
            <div className="flex justify-center sticky top-0">
              <span
                className="text-center font-semibold bg-[#665757a6] text-white my-3 rounded-full"
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.4rem" }}
              >
                {convertDateToReadable(date)}
              </span>
            </div>

            {allMessagesGrouped[date]?.map((msg) => {
              // system generated
              if (msg.message?.text?.includes?.("|SystemGenerated|")) {
                return (
                  <div key={msg._id} className="flex justify-center mb-2 text-[0.8rem]">
                    <span className="bg-[#665757a6] text-white py-2 rounded-full flex justify-center items-center w-fit gap-1" style={{ padding: "0.3rem 0.4rem" }}>
                      {msg.message.text.replace("|SystemGenerated|", "").trim()}
                    </span>
                  </div>
                );
              }

              const mine = String(msg.senderId) === String(user.id);
              return (
                <div key={msg._id} className={`py-2 px-5 mb-2 w-fit rounded-4xl max-w-[45%] ${mine ? "bg-blue-400 ml-auto" : "bg-gray-200"}`}>
                  {(chatMeta?.chat?.isGroupChat && !mine) && 
                  <div className="flex align-center mb-1 gap-2">
                    <img
                      src={`${
                        chatMembers[msg.senderId].photo.includes("googleusercontent") || chatMembers[msg.senderId].photo == "NA"
                          ? "./assets/user_img.jpg"
                          : chatMembers[msg.senderId].photo
                      }`}
                      className="rounded-full object-cover"
                      style={{ aspectRatio: "1", height: "1.5rem" }}
                    />
                    <p className="text-blue-950">{chatMembers[msg.senderId].name}</p>
                  </div>
                  }
                  {/* attachments */}
                  {msg.message?.url?.length > 0 && (
                    <div>
                      {msg.message.url.map((item) => (
                        <a className="bg-[#d1d5dc] px-2 rounded flex mb-1" href={item} key={item}>
                          {item.split("_").pop()}
                        </a>
                      ))}
                    </div>
                  )}
                  <p>{msg.message?.text ?? ""}</p>
                  <p className="text-xs italic text-right">{dateFormat(msg.timestamp)}</p>
                  <p className="text-xs italic text-right">{msg.status}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="w-full bg-gray-300 relative" id="footer">
        <div className="rounded-full p-4 border bg-white">
          <div className="flex flex-row items-center">
            {fileUpload.map((file) => (
              <span key={file.lastModified} className="bg-gray-200 p-1 rounded-md mr-2 mb-2 text-sm flex w-fit cursor-pointer">
                {file.name}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"  onClick={() => clearFileInput(file.lastModified)}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </span>
            ))}
          </div>

          {chatMeta?.chat?.members?.filter((m) => m._id == user.id).length > 0 ?
            <div className="flex flex-row items-center" ref={inputRef}>
              <label htmlFor="fileInput" className="cursor-pointer ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
              </label>
              <input type="file" id="fileInput" className="hidden" onChange={handleFileUpload} multiple />
              <input type="text" placeholder="Type a message..." className="rounded-md w-full h-4/5 ml-2 p-2 outline-none bg-transparent" onChange={handleTyping} onKeyDown={handleSend} />
              <button id="sendBtn" className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-full ml-2 cursor-pointer" onClick={handleSend}>
                Send
              </button>
            </div>
            : 
            <div className="p-4 text-center text-red-500 font-semibold">You are no longer a member of this group.</div>
          }

        </div>
      </div>

      <AnimatePresence>{openInfo && <ChatInfo data={chatMeta} user={user} open={openInfo} setOpen={setOpenInfo} allMessages={messages} setAllMessages={setMessages} />}</AnimatePresence>
    </div>
  );
}
