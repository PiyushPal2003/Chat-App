import React from 'react'
import Navbar from '../Navbar/Navbar'
import Chats from '../Chats/chats'
import UserChat from '../Chats/UserChat'

export default function Home() {
  return (
    <div className='w-full h-screen flex flex-col'>
      <Navbar/>

      {/* desktop */}
      <div className='h-full flex-1 hidden md:grid grid-cols-[3fr_7fr]'>
        <Chats/>
        <UserChat/>
      </div>

      {/* mobile */}
      <div className='h-full flex-1 md:hidden grid grid-cols-[1fr_3fr]'>
        <Chats/>
        <UserChat/>
      </div>


    </div>
  )
}
