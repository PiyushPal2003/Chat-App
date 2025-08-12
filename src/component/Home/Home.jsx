import React from 'react'
import Navbar from '../Navbar/Navbar'
import Chats from '../Chats/chats'
import UserChat from '../Chats/UserChat'

export default function Home() {
  return (
    <div>
      <Navbar/>

      {/* desktop */}
      <div className='hidden md:grid grid-cols-[300px_1fr]'>
        <Chats/>
        <UserChat/>
      </div>

      {/* mobile */}
      <div className='md:hidden grid grid-cols-[1fr_3fr]'>
        <Chats/>
        <UserChat/>
      </div>


    </div>
  )
}
