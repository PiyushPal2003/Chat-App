import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import io from "socket.io-client";
import toast, { Toaster } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import api from '../../Redux/apiRTK/api';
import { onlineUsersList } from '../../Redux/Reducers/authSlice';


const SocketContext = createContext();
const getSocket = () => useContext(SocketContext);

export default function Socket({children}) {
  // const socket = useMemo(() =>{ 
  //   io('http://localhost:5000', { withCredentials: true })
  // },[] );
  const dispatch = useDispatch();
  const [currChat, setCurrChat] = useState();
  const [typingStatus, setTypingStatus] = useState({});

  const socket = useMemo(() => io('http://localhost:5000', { withCredentials: true }) ,[] );

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
      dispatch(onlineUsersList(data));
    });
    
    socket.on("USER_DISCONNECTED", (data) => {
      console.log("User disconnected:", data);
      dispatch(onlineUsersList(data));
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
      socket.disconnect();
    }
  }, []);

  return (
    <SocketContext.Provider value={{socket, currChat, setCurrChat, typingStatus}}>
      {children}
    </SocketContext.Provider>
  )
}

export {getSocket};