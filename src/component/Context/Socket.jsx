import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import io from "socket.io-client";
import { useDispatch } from 'react-redux';
import api, { API_BASE_URL } from '../../Redux/apiRTK/api';
import { onlineUsersList } from '../../Redux/Reducers/authSlice';


const SocketContext = createContext();
const getSocket = () => useContext(SocketContext);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, "");
const OFFLINE_GRACE_MS = 5000;

export default function Socket({children}) {
  // const socket = useMemo(() =>{ 
  //   io('http://localhost:5000', { withCredentials: true })
  // },[] );
  const dispatch = useDispatch();
  const [currChat, setCurrChat] = useState();
  const [typingStatus, setTypingStatus] = useState({});
  const offlinePresenceTimerRef = useRef(null);

  const socket = useMemo(() => io(SOCKET_URL, { withCredentials: true }) ,[] );

  useEffect(()=>{

    socket.on("connect", () => {
      console.log(socket.id);
    });

    socket.on("connect_error", (err) => {
      console.log("Connection error:", err);
    });

    socket.on("NEW_USER", (data) => {
      console.log("New user joined:", data);
      dispatch(api.util.invalidateTags(['Users']));
    });

    socket.on("USER_CONNECTED", (data) => {
      console.log("User connected:", data);
      if (offlinePresenceTimerRef.current) {
        clearTimeout(offlinePresenceTimerRef.current);
        offlinePresenceTimerRef.current = null;
      }
      dispatch(onlineUsersList(data));
    });
    
    socket.on("USER_DISCONNECTED", (data) => {
      console.log("User disconnected:", data);
      if (offlinePresenceTimerRef.current) {
        clearTimeout(offlinePresenceTimerRef.current);
      }
      offlinePresenceTimerRef.current = setTimeout(() => {
        dispatch(onlineUsersList(data));
        offlinePresenceTimerRef.current = null;
      }, OFFLINE_GRACE_MS);
    });

    socket.on("newChat", (data) => {
      console.log("New chat created:", data);
      dispatch(api.util.invalidateTags(['Chats', 'currentChat']));
    });

    socket.on("updateUser", (data) => {
      console.log("users updated", data);
      dispatch(api.util.invalidateTags(['currentChat']));
    });

    socket.on("userTyping", (data) => {
      console.log("User typing:", data);
      const chatId = data.chatId;
      const userId = data.userId;
      if(!chatId) return;

      setTypingStatus(prev => {
        const arr = prev[chatId] || [];
        if (arr.includes(userId)) return {...prev};

        const updated = {
          ...prev,
          [chatId]: [...arr, userId]
        };

        return {...updated};
      });
    });
    socket.on("userStopTyping", (data) => {
      console.log("User stopped typing:", data);
      const chatId = data.chatId;
      const userId = data.userId;
      if(!chatId) return;

      setTypingStatus(prev => {
        const arr = prev[chatId] || [];

        const updated = {
          ...prev,
          [chatId]: arr.filter(id => id !== userId)
        };
        return {...updated};
      });
    });

    //new message received
    // socket.on("newMessage", (data) => {
    //   console.log("New message received:", data);
    //   // dispatch(api.util.invalidateTags(['UserMessages']));
    //   dispatch(api.util.invalidateTags(['Chats']));
    // });
    
    return()=>{
      if (offlinePresenceTimerRef.current) {
        clearTimeout(offlinePresenceTimerRef.current);
      }
      socket.disconnect();
    }
  }, [dispatch, socket]);

  return (
    <SocketContext.Provider value={{socket, currChat, setCurrChat, typingStatus}}>
      {children}
    </SocketContext.Provider>
  )
}

export {getSocket};
