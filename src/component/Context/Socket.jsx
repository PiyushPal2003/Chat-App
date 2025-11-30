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
    <SocketContext.Provider value={{socket, currChat, setCurrChat}}>
      {children}
    </SocketContext.Provider>
  )
}

export {getSocket};