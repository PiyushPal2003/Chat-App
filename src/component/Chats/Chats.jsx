import React from 'react'
import { useEffect } from 'react'
import { useGetChatsQuery } from '../../Redux/apiRTK/api'
import { useSelector } from 'react-redux';
import {getSocket} from "../Context/Socket";
import UserChat from './UserChat';

export default function Chats() {

    const {currChat} = getSocket();
    console.log("Current Chat ID:", currChat);
    const user = useSelector((state)=>state.auth);
    const { data, error, isLoading, isSuccess, refetch } = useGetChatsQuery(currChat && currChat);

    useEffect(()=>{
        if(isSuccess){
            console.log("Chat data fetched successfully:", data);
        }
        else if(error){
            console.error("Error fetching chat data:", error);
        }
    }, [isSuccess, error, currChat]);

  return (
    <>
    <div className='w-full h-screen flex flex-col'>
        <div className='h-full flex-1 md:hidden grid grid-cols-[1fr_3fr]'>
                {
                    data?.chats?.map((chat, index)=>(
                        <div className='flex flex-row w-full h-[5rem] items-center mb-5 border rounded-full p-1' key={index} >
                            <img src='./assets/user_img.jpg' className='rounded-full object-cover h-4/5'/>
                            <div className='flex flex-col ml-2'>
                                <h1 className='font-medium text-lg'>
                                    {chat?.members?.length<=2 ? chat?.members.find((f)=>f._id !== user.id)?.name : 'Group Chat'}
                                </h1>
                                <h1>Hi bro how are you??</h1>
                            </div>
                        </div>
                    ))
                }

            <UserChat/>
        </div>
    </div>
    </>
  )
}
