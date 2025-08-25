import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import io from "socket.io-client";
import {useNavigate} from "react-router-dom";
import toast, { Toaster } from 'react-hot-toast';


const SocketContext = createContext();
const getSocket = () => useContext(SocketContext);

export default function Socket({children}) {
  // const socket = useMemo(() =>{ 
  //   io('http://localhost:5000', { withCredentials: true })
  // },[] );
  const [currChat, setCurrChat] = useState(null);

  const socket = useMemo(() => io('http://localhost:5000', { withCredentials: true }) ,[] );

  useEffect(()=>{

    socket.on("connect", () => {
      console.log(socket.id);
    });

    socket.on("connect_error", (err) => {
      // toast('Unexpected Error, Try again later', {
      //   icon: '⚠️',
      // });
      console.log("Connection error:", err);
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