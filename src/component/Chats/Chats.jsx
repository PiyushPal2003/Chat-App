import React from 'react'
import { useEffect } from 'react'
import { useGetChatsQuery } from '../../Redux/apiRTK/api'
import { useSelector } from 'react-redux';

export default function Chats() {

    const user = useSelector((state)=>state.auth);
    if(user?.id){
        const { data, error, isLoading, isSuccess, refetch } = useGetChatsQuery(user.id);
    }

    useEffect(()=>{
        // useGetChatsQuery()
    })

  return (
    <div>
        {
            Array.from({length:6}).map((_, index)=>(
                <div className='flex flex-row w-full h-[5rem] items-center mb-5 border rounded-full p-1' key={index} >
                    <img src='./assets/user_img.jpg' className='rounded-full object-cover h-4/5'/>
                    <div className='flex flex-col ml-2'>
                        <h1 className='font-medium text-lg'>My Friend</h1>
                        <h1>Hi bro how are you??</h1>
                    </div>
                </div>
            ))
        }
    </div>
  )
}
