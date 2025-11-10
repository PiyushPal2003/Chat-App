import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {getSocket} from "../Context/Socket";
import {useFetchChatQuery, useSendChatMutation, useLazyFetchMessagesQuery} from "../../Redux/apiRTK/api"
import { motion, AnimatePresence } from "framer-motion";
import useElementInView from '../../custom_hooks/Intersection';
import { dateFormat, groupMessagesByDate, convertDateToReadable } from '../../Utilities';
import { Label } from '../../components/ui/label';
import ChatInfo from './ChatInfo';


export default function UserChat(props) {

  // const page = useRef(null);
  const [allMessages, setAllMessages] = useState({});
  const chatContainerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState({id: null, more: false});
  const [fileUpload, setFileUpload] = useState([]);
  const infoRef = useRef();
  const inputRef = useRef();
  const user = useSelector((state)=>state.auth);
  const [targetRef, isInView] = useElementInView(
    { 
      root: chatContainerRef.current,
      threshold: 0.8 
    }
  );
  // const {currChat} = getSocket();

  console.log("Current Chat ID prop:", props.currChatId);
  
  
  const {data, error, isLoading, isSuccess} = useFetchChatQuery(props?.currChatId, { skip: !props?.currChatId });

  const [fetchMessagesTrigger, { data: chatData , error:chatError , isLoading: chatLoading , isSuccess: chatSuccess, refetch }] = useLazyFetchMessagesQuery();

  const [sendChatMutation, { data: sentData, isLoading: isSending, isSuccess: sentSuccess, error: sentError }] = useSendChatMutation();
  
  console.log("UserChat component rendered", chatData);
  if(chatSuccess){
    console.log("Fetched messages", chatData);
  }

  if(isSuccess){
    console.log("Fetched chat data:", data);
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

      let receiverIdArray = data?.chat?.members?.filter(member => member._id !== user.id).map(member => member._id);

      const payload = new FormData();
      payload.append("senderId", user.id);
      payload.append("receiverId", JSON.stringify(receiverIdArray));
      if(message.length>0){
        payload.append("message", message);
      }
      
      if(fileUpload.length > 0){
        for(let i=0; i<fileUpload.length; i++){
          payload.append("files", fileUpload[i]);
        }
        setFileUpload([]);
      }
      
      receiverIdArray = [];
      
      sendChatMutation({data: payload, id: props?.currChatId})
      .unwrap()
      .then((res) => {
        console.log("Chat sent successfully:", res);
        const date = new Date(res.chat.timestamp).toDateString();
        if(!allMessages[date]){
            // allMessages[date] = [];
          setAllMessages((prev)=>
              ({...prev, [date]: []})
          );
        }
        setAllMessages((prev)=>(
          {...prev, [date]: [...prev[date], res.chat]}
        ))
        // const withNewMessage = [...allMessages, res.chat];
        // const groupedMessage = groupMessagesByDate(withNewMessage);

        // setAllMessages(groupedMessage);
        // setAllMessages((prev)=>[...prev, res.chat])
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

  function handleInfo(){
    console.log("changing info open state");
    setOpen((prev)=>!prev);
  }

  useEffect(() => {
    if (isInView) {
      if(lastMessage.more && lastMessage.id){
        console.log("Last message ID:", lastMessage.id);
        fetchMessagesTrigger({id: props?.currChatId, lastMessageId: lastMessage.id}).unwrap()
        .then((res)=>{
          console.log("More messages fetched on scroll:", res);
          const newMessages = [...res?.messages].reverse();

              setAllMessages((prev) => {
                let updated = { ...prev };

                newMessages.forEach((msg) => {
                  const date = new Date(msg.timestamp).toDateString();
                  if (!updated[date]) {
                    updated = {[date] : [], ...updated}; 
                  }
                  updated[date] = [msg, ...updated[date]];
                });

                return updated;
              });

          // const combinedMessages = [...res?.messages, ...allMessages];
          // const groupedMessage = groupMessagesByDate(combinedMessages);
          // setAllMessages(groupedMessage);
          // setAllMessages((prev)=>[...res?.messages, ...prev]);

          let hasMore = false;
          res?.messages.length < 8 ? hasMore = false : hasMore = true;
          setLastMessage({
            id : res?.messages[0]?._id,
            more : hasMore
          });
        });
        // setLastMessage((prev)=>({...prev, id: }) );
      }
      console.log("Chat container is in view");
    }
  }, [isInView]);

  useEffect(()=>{
    if(chatContainerRef.current){
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatData]);

  useEffect(()=>{
    console.log(props?.currChatId);
    fetchMessagesTrigger({id: props?.currChatId}).unwrap()
    .then((res)=>{
      console.log("Messages fetched on chat change:", res);

      const groupedMessage = groupMessagesByDate(res?.messages);

      setAllMessages(groupedMessage);

      setLastMessage(()=>{
        let hasMore = false;
        res?.messages.length < 8 ? hasMore = false : hasMore = true;
        console.log(hasMore)
        return{
          id : res?.messages[0]?._id,
          more : hasMore
        }
      });

    });

  }, [props?.currChatId]);


  return (
    <div className='relative w-full h-[calc(100vh-4rem)] flex flex-col border justify-between overflow-x-hidden'>
      
      {/* head */}
      <div className='w-full h-16 border flex flex-row items-center' id='header'>

        <div className='w-full h-full flex flex-row items-center'>
          <img src={
              data?.chat?.isGroupChat ?
              data?.chat?.photo=='NA'?'./assets/grp_img.jpg':data?.chat?.photo
              :
              data?.chat?.members.find((f)=>f._id !== user.id)?.profilePhoto=="NA" ? './assets/user_img.jpg' : data?.chat?.members.find((f)=>f._id !== user.id)?.profilePhoto
            }
              className='rounded-full object-cover h-4/5'
              style={{aspectRatio: '1/1'}}
          />
          <div>
              <h1 className='font-medium text-lg ml-2'>
                {data?.chat?.isGroupChat ? data?.chat?.grpname : data?.chat?.members?.filter(member => member._id !== user.id)[0]?.name}
              </h1>
              <h1 className='text-sm ml-2'>
                {data?.chat?.isGroupChat ?
                  (() => {
                    const onlineCount = data?.chat?.members?.reduce(
                      (acc, member) =>
                        acc + (member._id !== user.id && user.onlineUsers[member._id] ? 1 : 0),
                      0
                    );
                    return onlineCount > 0
                    ? <span className="text-[0.8rem] text-green-500">{onlineCount} member{onlineCount > 1 ? "s" : ""} online</span>
                    : <span className="text-[0.8rem] text-red-500">No members online</span>;
                  })()
                  :
                  (user.onlineUsers[data?.chat?.members?.filter(member => member._id !== user.id)[0]?._id] ? 
                  ( <span className="text-[0.7rem] text-green-500">🟢 Online</span>
                  ) : (
                    <span className="text-[0.7rem] text-red-500">🔴 Offline</span>)
                  )
                }
              </h1>
          </div>
        </div>

          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className='size-6 mr-4 cursor-pointer' onClick={handleInfo}  aria-label="Open chat settings" role="button">
            <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>


      </div>
        


        {/* baatien */}
        <div className='bg-gray-300 flex-1 p-4 overflow-y-auto' ref={chatContainerRef}>
          <div ref={targetRef} />
            {
              Object.keys(allMessages).map((date, indx)=>(
              <div className='relative'>
                <div className='flex justify-center sticky top-0'>
                  <span className="text-center font-semibold bg-[#665757a6] text-white my-3 rounded-full" style={{fontSize: '0.8rem', padding: '0.3rem 0.4rem'}} key={indx}>
                    {convertDateToReadable(date)}
                  </span>
                </div>

                {
                  allMessages[date].map((msg, idx)=>{
                    //systemGenerated chat
                    if(msg.message.text.includes('|SystemGenerated|')){
                      return(
                       <div className='flex justify-center mb-2 text-[0.8rem]'>
                        <span className="bg-[#665757a6] text-white py-2 rounded-full flex justify-center items-center w-fit gap-1" style={{padding: '0.3rem 0.4rem'}}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                          </svg>
                          {msg.message.text.replace('|SystemGenerated|', '').trim()}
                        </span>
                      </div>)
                    }
                    else if(msg.senderId === user.id){
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
                        <div className='w-full'>
                          <p>{msg.message.text ? msg.message.text : ''}</p>
                          <p className='text-xs italic text-right'>{dateFormat(msg.timestamp)}</p>
                        </div>
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
                        <p className='text-xs italic text-right'>{dateFormat(msg.timestamp)}</p>
                      </div>
                    }
                  })
                }
              </div>
              
              ))
                // allMessages?.map((msg, idx)=>{
                //   if(msg.senderId === user.id){
                //     return <div className='py-2 px-5 mb-2 bg-blue-400 w-fit rounded-4xl ml-auto max-w-[45%]'>
                //       <div>
                //         {msg.message.url ? msg?.message?.url.map((item)=>(
                //             <a className='bg-[#d1d5dc] px-2 rounded flex mb-1' href={item} key={item}>
                //               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                //                 <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                //               </svg>
                //               {item.split("_").pop()}
                //             </a>
                //           )) 
                //           : 
                //           ''
                //         }
                //       </div>
                //       <div className='w-full'>
                //         <p>{msg.message.text ? msg.message.text : ''}</p>
                //         <p className='text-xs italic text-right'>{dateFormat(msg.timestamp)}</p>
                //       </div>
                //     </div>
                //   }
                //   else{
                //     return <div className='py-2 px-5 mb-2 bg-blue-400 w-fit rounded-4xl max-w-[45%]'>
                //       <div>
                //         {msg.message.url ? msg?.message?.url.map((item)=>(
                //             <a className='bg-[#d1d5dc] px-2 rounded flex mb-1' href={item} key={item}>
                //               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                //                 <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                //               </svg>
                //               {item.split("_").pop()}
                //             </a>
                //           )) 
                //           : 
                //           ''
                //         }
                //       </div>
                //       <p>{msg.message.text ? msg.message.text : ''}</p>
                //       <p className='text-xs italic text-right'>{dateFormat(msg.timestamp)}</p>
                //     </div>
                //   }
                // })

            }
          
        </div>



      {/* foot */}
      <div className='w-full bg-gray-300 relative' id='footer'>

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
            <button id="sendBtn" className='bg-blue-500 text-white font-semibold px-4 py-2 rounded-full ml-2 cursor-pointer' onClick={sendChat}>Send</button>
          </div>
        </div>

      </div>
      
      <AnimatePresence>
        {open && 
          <ChatInfo data={data} ref={infoRef} user={user} open={open} setOpen={setOpen} handleInfo={handleInfo} allMessages={allMessages} setAllMessages={setAllMessages}/>
        }

      </AnimatePresence>

      
      {/* <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl p-4"
          >
            <h2 className="font-semibold">Chat Settings</h2>
            <button onClick={() => setOpen(false)}>Close</button>
          </motion.div>
        )}
      </AnimatePresence> */}



      {/* edit */}
            {/* ===== Local Drawer (inside chat area) ===== */}
      {/* Backdrop (only inside the chat component) */}
      {/* <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${openDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeSetting}
        aria-hidden={!openDrawer}
      /> */}

      {/* Drawer panel anchored to right side inside this component */}
      {/* <aside
        role="dialog"
        aria-modal="true"
        className={`absolute top-16 right-4 w-80 max-w-[90%] bg-white rounded-lg shadow-xl transform transition-transform duration-300
          ${openDrawer ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}
        style={{ zIndex: 60 }}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Chat Settings</h3>
          <button onClick={closeSetting} className="p-1 rounded hover:bg-gray-100" aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3">
            <label className="block text-sm text-gray-600">Notifications</label>
            <div className="flex items-center mt-2">
              <input id="notif" type="checkbox" className="mr-2" />
              <label htmlFor="notif" className="text-sm">Mute notifications for this chat</label>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm text-gray-600">Members</label>
            <div className="mt-2 text-sm">
              {data?.chat?.members?.map((m)=>(
                <div key={m._id} className="flex items-center justify-between py-1">
                  <span>{m.name}</span>
                  <span className="text-xs text-gray-500">{user.onlineUsers[m._id] ? 'Online' : 'Offline'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={()=>{ closeSetting(); }}>Save</Button>
            <Button variant="outline" onClick={closeSetting}>Cancel</Button>
          </div>
        </div>
      </aside> */}
      {/* ===== end local drawer ===== */}
      

    </div>
  )
}
