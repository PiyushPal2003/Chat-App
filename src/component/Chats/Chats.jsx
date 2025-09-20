import React, { useRef } from 'react'
import { useEffect } from 'react'
import { useGetChatsQuery } from '../../Redux/apiRTK/api'
import { useSelector } from 'react-redux';
import {getSocket} from "../Context/Socket";
import UserChat from './UserChat';

export default function Chats() {

    const initialRef = useRef(true);
    const {currChat, setCurrChat} = getSocket();
    console.log("Current Chat ID:", currChat);
    const user = useSelector((state)=>state.auth);
    const { data, error, isLoading, isSuccess, refetch } = useGetChatsQuery(user?.id);


    function render(){
        if(isLoading){
            return <h1>Loading chats...</h1>
        }
        else if(isSuccess){
            console.log("Fetched chats list:", data);
            if(data?.chats?.length === 0){
                return (
                    <div className='h-full flex-1 flex flex-col items-center justify-center'>
                        <h1 className='font-bold text-2xl mb-5'>No Chats Found</h1>
                        <h1 className='text-center'>Start a new chat by clicking on the user icon on the top left corner.</h1>
                    </div>
                )
            }

            return (
                <div className='h-full flex-1 grid grid-cols-[1fr_3fr]'>
                    <div>
                    {
                        data?.chats?.map((chat, index)=>(
                            <div className='flex flex-row w-full h-[5rem] items-center mb-5 border rounded-full p-1 cursor-pointer' key={index} onClick={()=>setCurrChat(chat._id)}>
                                <img src='./assets/user_img.jpg' className='rounded-full object-cover h-4/5'/>
                                <div className='flex flex-col ml-2'>
                                    <h1 className='font-medium text-lg'>
                                        {chat?.members?.length<=2 ? chat?.members.find((f)=>f._id !== user.id)?.name : chat?.grpname}
                                    </h1>
                                    <h1>{chat.lastMessage}</h1>
                                </div>
                            </div>
                        ))
                    }
                    </div>

                    <UserChat currChatId={currChat} />
                </div>
            )
        }
        else if(error){
            return <h1>Error loading chats</h1>
        }
    }

    useEffect(()=>{
        if(isSuccess){
            console.log("Chat data fetched successfully:", data);
            if(initialRef.current){
                setCurrChat(data?.chats[0]?._id);
                initialRef.current = false;
            }
        }
        else if(error){
            console.error("Error fetching chat data:", error);
        }
        render();
    }, [isSuccess, error, currChat]);

  return (
    <>
    <div className='w-full h-screen flex flex-col'>
        {/* <div className='h-full flex-1 grid grid-cols-[1fr_3fr]'>

        { data?.chats?.length === 0 ?(
            <div className='flex flex-col items-center justify-center'>
                <h1 className='font-bold text-2xl mb-5'>No Chats Found</h1>
                <h1 className='text-center'>Start a new chat by clicking on the user icon on the top left corner.</h1>
            </div>
            ) : (
                <>
                    {data?.chats?.map((chat, index)=>(
                        <div className='flex flex-row w-full h-[5rem] items-center mb-5 border rounded-full p-1' key={index} onClick={()=>setCurrChat(chat._id)}>
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

                    <UserChat currChatId={currChat} />
                </>
            
            )
        }
        </div> */}
        {render()}
    </div>
    </>
  )
}
