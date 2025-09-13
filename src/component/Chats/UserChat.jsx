import React from 'react'
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {getSocket} from "../Context/Socket";
import {useFetchChatQuery} from "../../Redux/apiRTK/api"

export default function UserChat(props) {

  const user = useSelector((state)=>state.auth);
  const {currChat} = getSocket();  
  console.log("Current Chat ID prop:", props.currChatId);
  const id = props.currChatId;

  const { data, error, isLoading, isSuccess, refetch } = useFetchChatQuery(id);
  // data?.chat?.members?.filter(member => member._id !== user.id)[0]?.name;

  useEffect(()=>{
    if(isSuccess){
        console.log("Fetched chat details successfully:", data);
    }
    else if(error){
        console.error("Error fetching chat details:", error);
    }
  }, [isSuccess, error]);

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
        



      {/* foot */}
      <div className='w-full'>

        <div className='rounded-full p-4 border flex flex-row items-center'>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
          <input type="text" placeholder='Type a message...' className='rounded-md w-full h-4/5 ml-2 p-2 outline-none bg-transparent' />
        </div>

      </div>

    </div>
  )
}
