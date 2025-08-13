import React from 'react'

export default function Chats() {
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
