import React from 'react'
import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import {getSocket} from "../Context/Socket";
import {useFetchChatQuery, useSendChatMutation, useFetchMessagesQuery} from "../../Redux/apiRTK/api"

export default function UserChat(props) {

  const page = useRef(null);
  const [fileUpload, setFileUpload] = useState([]);
  const inputRef = useRef();
  const user = useSelector((state)=>state.auth);
  const {currChat} = getSocket();  
  console.log("Current Chat ID prop:", props.currChatId);
  // const id = props.currChatId;
  // console.log("Fetching details for Chat ID:", id);

  const {data, error, isLoading, isSuccess} = useFetchChatQuery(props?.currChatId, page, { skip: !props?.currChatId });

  const { data: chatData , error:chatError , isLoading: chatLoading , isSuccess: chatSuccess } = useFetchMessagesQuery(props?.currChatId, { skip: !props?.currChatId })

  const [sendChatMutation, { data: sentData, isLoading: isSending, isSuccess: sentSuccess, error: sentError }] = useSendChatMutation();

  if(chatSuccess){
    console.log("Fetched messages", chatData);
  }

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
      if(message.length>0){
        payload.append("message", message);
      }

      // const fileUploadElement = parent.children[1];
      if(fileUpload.length > 0){
        for(let i=0; i<fileUpload.length; i++){
          payload.append("files", fileUpload[i]);
        }
        setFileUpload([]);
      }

      // console.log("payload:", payload);
      
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
    const files = Array.from(e.target.files);
    setFileUpload(files);
  }
  function clearFileInput(id){
    const files = fileUpload.filter((file, index) => file.lastModified !== id);
    setFileUpload(files);
  }

  return (
    <div className='w-full h-[calc(100vh-4rem)] flex flex-col border justify-between'>
      {/* head */}
      <div className='w-full h-16 border flex flex-row items-center'>
        <img src='./assets/user_img.jpg' className='rounded-full h-4/5'/>
        <div>
          <h1 className='font-medium text-lg ml-2'>
            {data?.chat?.isGroupChat ? data?.chat?.grpname : data?.chat?.members?.filter(member => member._id !== user.id)[0]?.name}
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
        <div className='bg-gray-300 flex-1 p-4 overflow-y-auto'>

            {
              chatData?.messages?.map((msg, idx)=>{
                if(msg.senderId === user.id){
                   return <div className='py-2 px-5 mb-2 bg-blue-400 w-fit rounded-4xl ml-auto max-w-[45%]'>
                    <div>
                      {msg.message.url ? msg?.message?.url.map((item)=>(
                          <a className='bg-[#d1d5dc] px-2 rounded flex mb-1' href={item} key={item}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            {item.split("_").pop()}
                          </a>
                        )) 
                        : 
                        ''
                      }
                    </div>
                    <p>{msg.message.text ? msg.message.text : ''}</p>
                  </div>
                }
                else{
                  return <div className='py-2 px-5 mb-2 bg-blue-400 w-fit rounded-4xl max-w-[45%]'>
                    <div>
                      {msg.message.url ? msg?.message?.url.map((item)=>(
                          <a className='bg-[#d1d5dc] px-2 rounded flex mb-1' href={item} key={item}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            {item.split("_").pop()}
                          </a>
                        )) 
                        : 
                        ''
                      }
                    </div>
                    <p>{msg.message.text ? msg.message.text : ''}</p>
                  </div>
                }
              })
            }

        </div>



      {/* foot */}
      <div className='w-full bg-gray-300 relative'>

        <div className='rounded-full p-4 border bg-white' >

          <div className='flex flex-row items-center'>
            {
              fileUpload.map((file, index) => (
                <span className='bg-gray-200 p-1 rounded-md mr-2 mb-2 text-sm flex w-fit cursor-pointer' key={index} onClick={()=>clearFileInput(file.lastModified)}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                  {file.name}
                </span>
              ))
            }
          </div>

          <div className='flex flex-row items-center' ref={inputRef}>
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

    </div>
  )
}
