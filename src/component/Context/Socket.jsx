import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import io from "socket.io-client";
import toast, { Toaster } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import api from '../../Redux/apiRTK/api';


const SocketContext = createContext();
const getSocket = () => useContext(SocketContext);

export default function Socket({children}) {
  // const socket = useMemo(() =>{ 
  //   io('http://localhost:5000', { withCredentials: true })
  // },[] );
  const dispatch = useDispatch();
  const [currChat, setCurrChat] = useState(null);

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