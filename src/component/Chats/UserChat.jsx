import React from 'react'
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {getSocket} from "../Context/Socket";
import {useFetchChatQuery, useSendChatMutation} from "../../Redux/apiRTK/api"
import axios from 'axios';

export default function UserChat(props) {

  const inputRef = useRef();
  const user = useSelector((state)=>state.auth);
  const {currChat} = getSocket();  
  console.log("Current Chat ID prop:", props.currChatId);
  // const id = props.currChatId;
  // console.log("Fetching details for Chat ID:", id);

  const { data, error, isLoading, isSuccess, refetch } = useFetchChatQuery(props?.currChatId, { skip: !props?.currChatId });

  const [sendChatMutation, { data: sentData, isLoading: isSending, isSuccess: sentSuccess, error: sentError }] = useSendChatMutation();


  function sendChat(e){
    // e.preventDefault();
    const parent = inputRef.current;

    if(e.key === 'Enter' || e.target.id === 'sendBtn'){
      
      let message;
      if(e.key === 'Enter'){
        message = e.target.value.trim();
        e.target.value = "";
      }
      else if(e.target.id === 'sendBtn'){
        // message = e.target.previousElementSibling.value.trim();
        message = parent.children[2].value.trim();
        parent.children[2].value = "";
      }

      const payload = new FormData();
      payload.append("senderId", user.id);
      payload.append("receiverId", data?.chat?.members?.filter(member => member._id !== user.id)[0]?._id);
      payload.append("message", message);

      const fileUploadElement = parent.children[1];
      if(fileUploadElement.files.length > 0){
        for(let i=0; i<fileUploadElement.files.length; i++){
          payload.append("files", fileUploadElement.files[i]);
        }
      }

      console.log("payload:", payload);
      
      sendChatMutation({data: payload, id: props?.currChatId})
      .unwrap()
      .then((res) => {
        console.log("Chat sent successfully:", res);
      })
      .catch((err) => {
        console.error("Error sending chat:", err);
      });
    }
  }

  function handleFileUpload(e){
    console.log(e.target.files)

  }

  // useEffect(()=>{
  //   if(isSuccess){
  //       console.log("Fetched chat details successfully:", data);
  //   }
  //   else if(error){
  //       console.error("Error fetching chat details:", error);
  //   }
  // }, [isSuccess, error]);

  return (
    <div className='w-full h-full flex flex-col border justify-between'>
      {/* head */}
      <div className='w-full h-16 border flex flex-row items-center'>
        <img src='./assets/user_img.jpg' className='rounded-full h-4/5'/>
        <div>
          <h1 className='font-medium text-lg ml-2'>
            {data?.chat?.members?.filter(member => member._id !== user.id)[0]?.name}
          </h1>
          <h1 className='text-sm ml-2'>
            {user.onlineUsers[data?.chat?.members?.filter(member => member._id !== user.id)[0]?._id] ? 
            (
              <span className="text-[0.7rem] text-green-500">🟢 Online</span>
            ) : (
              <span className="text-[0.7rem] text-red-500">🔴 Offline</span>
            )
            }
          </h1>
        </div>

      </div>
        


        {/* conversations */}
        <div className='bg-gray-300 flex-1 p-4'>
            <p className='p-2 bg-blue-400 w-fit rounded-full max-w-[45%]'>Hello Hello Hello Hello Hello Hello Hello Hello Hello</p>
            <p className='p-2 bg-blue-400 w-fit rounded-full ml-auto max-w-[45%]'>Hi there Hi there Hi there Hi there Hi there</p>
            
            <p className='p-2 bg-blue-400 w-fit rounded-full max-w-[45%]'>{data?.chat?.members?.filter(member => member._id !== user.id)[0]?._id}</p>
            <p className='p-2 bg-blue-400 w-fit rounded-full ml-auto max-w-[45%]'>{user.id}</p>
        </div>



      {/* foot */}
      <div className='w-full'>

        <div className='rounded-full p-4 border flex flex-row items-center relative' ref={inputRef}>
        
          <div className='bg-blue-300 rounded-t-md absolute top-0 w-full left-0'>
            Hello
          </div>

          {/* 0 */}
          <label htmlFor="fileInput" className="cursor-pointer ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
          </label>
          {/* 1 */}
          <input type="file" id="fileInput" className="hidden" onChange={handleFileUpload} multiple/>

          {/* 2 */}
          <input type="text" placeholder='Type a message...' className='rounded-md w-full h-4/5 ml-2 p-2 outline-none bg-transparent' onKeyDown={sendChat} />
          {/* 3 */}
          <button id="sendBtn" className='bg-blue-500 text-white font-semibold px-4 py-2 rounded-full ml-2' onClick={sendChat}>Send</button>
        </div>

      </div>

    </div>
  )
}
