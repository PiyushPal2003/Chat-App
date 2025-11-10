import React, {useEffect, useState, useRef} from 'react'
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from 'react-redux';
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {getSocket} from "../Context/Socket";
import toast from 'react-hot-toast';
import { useEditGroupMutation, useCreateChatMutation } from '../../Redux/apiRTK/api';

const ChatInfo = React.memo(React.forwardRef(({data, user, open, setOpen, allMessages, setAllMessages}, ref)=>{

    const [editValues, setEditValues] = useState({
        grpname: data?.chat?.grpname,
        grpdesc: data?.chat?.description,
    });
    const [showEditDialog, setshowEditDialog] = useState(false);
    const {currChat, setCurrChat} = getSocket();
    const usr = useSelector((state)=>state.auth);
    const [editGroupChat] = useEditGroupMutation();
    const [createChat, { data: createUserData, error: createuserError, isLoading: createUserLoading, isSuccess: createUserSuccess }] = useCreateChatMutation();

    function handleProfilePhoto(event) {
        const file = event.target.files[0];
        console.log(file);
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            document.querySelector('#editImg').src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
    }

    function makeAdmin(id, name) {
      const payload = new FormData();
      payload.append("convoId", data?.chat?._id);
      payload.append("admin", JSON.stringify({id: id, name: name}));
      payload.append("user", usr?.name);

      editGroupChat(payload)
        .unwrap()
        .then((res) => {
          console.log("Profile edited successfully:", res);
          const date = new Date(res.chat.timestamp).toDateString();
          if(!allMessages[date]){
            setAllMessages((prev)=>
                ({...prev, [date]: []})
            );
          }
          setAllMessages((prev)=>(
            {...prev, [date]: [...prev[date], res.chat]}
          ));
        });
    }

    function messageUser(id) {
      createChat(id).unwrap()
      .then((res) => {
        console.log(res);
        if(res.status == 200){
          console.log("Chat created successfully:", res);
          setOpen(false);
          setCurrChat(res.chat._id);
          toast.success(
            <div>
            <p className="font-bold">Chat Created</p>
          </div>,
          {
            duration: 2200,
            position: 'top-center',
          }
          );
        }
        else if(res.status == 201){
          console.log("Chat already exists", res);
          setOpen(false);
          setCurrChat(res.chat._id);
        }
        else if(res.status == 500){
          toast.error(
            <div>
            <p className="font-bold">Internal Server Error</p>
          </div>,
          {
            duration: 2200,
            position: 'top-center',
          }
          );
        }
      })
      .catch((err) => {
        // toast.error("Failed to create chat");
        console.error(err);
        if(err?.data?.message?.errorResponse?.code === 11000){
          toast.error(
            <div>
              <p className="font-bold">Chat already exists!</p>
              <p>Please check your chat list.</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );
        }else{
          toast.error(
            <div>
              <p className="font-bold">Unexpected Error!</p>
              <p>Please try again after some time.</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );
        }
      });
    }

    function closeEditDialog() {
      setshowEditDialog(false);
      // setTimeout(() => {
      //   document.body.style.pointerEvents = 'auto';
      // }, 250);
      setEditValues({ grpname: data?.chat?.grpname, grpdesc: user?.description });
    }

    function grpEditSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const payload = new FormData();
        const grpPhoto = formData.get('grpPhoto');
        const grpdesc = formData.get('desc').trim();
        const grpname = formData.get('name');

        const isDummyPhoto = grpPhoto && grpPhoto.name === "grp_img.jpg";
        if (!isDummyPhoto && grpPhoto && grpPhoto.name) {
          payload.append("grpPhoto", grpPhoto);
        }
        if (grpdesc && grpdesc !== data?.chat?.description) {
          payload.append("description", grpdesc);
        }
        if (grpname && grpname !== data?.chat?.grpname) {
        payload.append("name", grpname);
        }
        payload.append("convoId", data?.chat?._id);
        payload.append("old_grpname", data?.chat?.grpname);
        payload.append("user", usr?.name);

        if ([...payload.keys()].length > 0) {
          payload.forEach((value, key) => {
            console.log(key, value);
          });
          editGroupChat(payload)
            .unwrap()
            .then((res) => {
              console.log("Profile edited successfully:", res);

              const date = new Date(res.chat.timestamp).toDateString();
              if(!allMessages[date]){
                setAllMessages((prev)=>
                    ({...prev, [date]: []})
                );
              }
              setAllMessages((prev)=>(
                {...prev, [date]: [...prev[date], res.chat]}
              ));

              setshowEditDialog(false);
            })
            .catch((err) => {
              console.error("Error editing profile:", err);
            });
        }
    }

// console.log('open state in chat info:', open);
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      document.body.style.pointerEvents = 'auto';
      const insideDialogOverlay = event.target.closest('[data-slot="dialog-overlay"]');
      // const insideDialog = dialogRef.current && dialogRef.current.contains(event.target);
      const clickedInsideDrawer = ref.current && ref.current.contains(event.target);
      const htmlTagClicked = event.target === document.documentElement
      const clickedInsideDialog = event.target.closest('[role="dialog"]');
      const clickedInsideDropdown = event.target.closest('[role="menu"]');

      if (!clickedInsideDrawer && !htmlTagClicked && !clickedInsideDropdown && !clickedInsideDialog && !insideDialogOverlay) {
          setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
    
    {data?.chat?.isGroupChat ? 
      (<motion.div
      initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className='absolute w-full h-[calc(100vh-8rem)] left-0 bottom-0 right-0 bg-white' id='settingDrawer'
        ref={ref}
        // onMouseDown={(e) => {e.stopPropagation();}}
      >
        <div className='relative w-full h-full p-5 rounded-tl-3xl rounded-tr-3xl bg-[#ebebeb]'> 
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <button className="absolute top-5 right-5 flex items-center px-2 py-1 rounded cursor-pointer ml-auto text-xs" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                    </svg>
                  </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-fit" align="start">
                <DropdownMenuGroup>
                  {data?.chat?.admin?.includes(usr?.id) &&
                  <>
                  <DropdownMenuItem onClick={() => setshowEditDialog(true)}>
                    Edit Group Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setshowEditDialog(true)}>
                    Add Users
                  </DropdownMenuItem>
                  </>
                  }
                  <DropdownMenuItem>
                    Leave Group
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
        
            <div className='md:h-[12%] my-5 flex flex-col md:flex-row items-center justify-center gap-5'>
              <img src={
                data?.chat?.photo == 'NA' ? './assets/grp_img.jpg' : data?.chat?.photo
              } 
              className='rounded-full object-cover h-22 md:h-full'
              style={{aspectRatio: '1/1'}}
            />
              <div className='flex flex-col items-center md:items-start gap-1'>
                <h1 className='font-medium text-xl'>{data?.chat?.grpname}</h1>
                <h1 className='text-md'>Group ∙ {data?.chat?.members?.length} members</h1>
                {/* <h3>Description: {data?.chat?.description || '- - -'}</h3> */}
                <h1 className='text-center text-sm text-gray-600 italic'>Created On:{' '}
                    {new Date(data?.chat?.timestamp)
                          .toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          })}
                </h1>
              </div>
            </div>
            {data?.chat?.description && <h1 className='text-center'><span className='font-semibold'>Description</span>: {data?.chat?.description}</h1>}

            <div>
                <h1 className='text-start font-semibold'>Group Members:</h1>
                <div className='grid grid-cols-1 mt-2 md:m-0 md:grid-cols-2 lg:grid-cols-3 gap-1 md:gap-3'>
                    {data?.chat?.members?.map((member, index)=>(
                        <div key={index} className='relative flex justify-between items-center rounded-lg bg-[#d8d8d8]'>
                            <div className='flex items-center gap-3 my-0 md:my-1 p-2'>
                              <img src={member.profilePhoto=='NA' ? './assets/user_img.jpg' : member.profilePhoto} className='h-12 rounded-full object-cover' style={{aspectRatio: '1/1'}} />
                              <div className='flex flex-col'>
                                  <h1 className=''>{member.name}</h1>
                                  <h1 className='text-sm'>{member.email}</h1>
                                  <h1 className='text-sm'>{member.desc || ''}</h1>
                              </div>
                            </div>

                            {member._id !== usr?.id && 
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6 transform rotate-90 mr-3 cursor-pointer">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                </svg>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-fit" align="start">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onClick={()=>messageUser(member._id)}>
                                    Message
                                  </DropdownMenuItem>
                                  {data?.chat?.admin?.includes(usr?.id) &&
                                  <>
                                  {data?.chat?.admin?.includes(!member?._id) &&
                                    <DropdownMenuItem onClick={() => {makeAdmin(member._id, member.name)}}>
                                      Make Admin
                                    </DropdownMenuItem>
                                  }
                                  <DropdownMenuItem>
                                    Remove
                                  </DropdownMenuItem>
                                  </>
                                  }
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>}

                            {data?.chat?.admin?.includes(member._id) && <span className='absolute top-2 right-2 p-1 rounded-md font-semibold text-xs bg-amber-200'>Admin</span>}
                        </div>
                    ))
                    }
                </div>
            </div>

            <div className='mt-5'>
                <h1 className='text-start font-semibold'>Group Media:</h1>
            </div>
    
        </div>
      </motion.div>)
        :
      (<motion.div 
        initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className='absolute w-full h-[calc(100vh-8rem)] left-0 bottom-0 right-0 bg-white' id='settingDrawer'
            ref={ref}
        >
        <div className='w-full h-full'>
            <div className='w-full h-full flex flex-col items-center justify-center gap-2'>
              <img src={
                data?.chat?.members?.filter(member => member._id !== user.id)[0]?.profilePhoto == 'NA' ? './assets/user_img.jpg' : data?.chat?.members?.filter(member => member._id !== user.id)[0]?.profilePhoto
              } 
              className='rounded-full object-cover h-15'
              style={{aspectRatio: '1/1'}}
              />
              <h1 className='font-medium text-xl'>
                {data?.chat?.members?.filter(member => member._id !== user.id)[0]?.name}
              </h1>
              <p className='text-center text-gray-600'>
                {
                  `Joined On: ${new Date(
                        data?.chat?.members?.find(member => member._id !== user.id)?.timestamp
                      ).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Kolkata",
                      })}`
                }
              </p>
              <p className='text-center text-gray-600'>{data?.chat?.members?.filter(member => member._id !== user.id)[0]?.email}</p>
            </div>
        </div>
      </motion.div>)
      }


    
        <Dialog open={showEditDialog} onOpenChange={(issOpen) => {setshowEditDialog(issOpen)}}>
            <DialogContent className="w-xl">
              <DialogHeader>
                <DialogTitle>Update Chat Details</DialogTitle>
                <DialogDescription>
                  Update your group's name, description, and profile photo.
                </DialogDescription>
              </DialogHeader>
                  <div className="flex flex-col items-center mt-4 gap-1">
                    <form className="w-full flex flex-col items-center" onSubmit={grpEditSubmit}>
                      <div className="flex items-center justify-center flex-col">
                        <img
                          src={
                            data?.chat?.photo == 'NA' ? './assets/grp_img.jpg' : data?.chat?.photo
                          }
                          className="rounded-full object-cover w-20 h-20"
                          id="editImg"
                        />
                        <Label htmlFor="profile-photo" className="cursor-pointer text-sm hover:underline">
                          Update Profile Photo
                        </Label>
                        <input
                          type="file"
                          id="profile-photo"
                          className="hidden"
                          placeholder="Update Profile Photo"
                          onChange={handleProfilePhoto}
                          name="grpPhoto"
                        />
                      </div>

                      <div className="items-center w-6/10">
                        <Label htmlFor="editName">Group Name:</Label>
                        <Input
                          name="name"
                          className="border rounded p-2"
                          value={editValues.grpname || ""}
                          placeholder="Enter Group Name"
                          id="editName"
                          onChange={(e) => setEditValues({ ...editValues, grpname: e.target.value })}
                        />
                      </div>

                      <div className="items-center w-6/10">
                        <Label htmlFor="editDesc">Group Description:</Label>
                        <Input
                          name="desc"
                          className="border rounded p-2"
                          value={editValues.grpdesc || ""}
                          placeholder="Enter Description"
                          id="editDesc"
                          onChange={(e) => setEditValues({ ...editValues, grpdesc: e.target.value })}
                        />
                      </div>
                            
                      <div className="flex mt-4 gap-2 justify-end w-full">
                        <button type="submit" className="cursor-pointer bg-black text-white px-3 py-1 rounded">
                          Save
                        </button>
                        <button
                          className="bg-gray-300 px-3 py-1 rounded"
                          type="button"
                          onClick={closeEditDialog}
                        >
                          Cancel
                        </button>
                      </div>
                            
                    </form>
                    </div>
            </DialogContent>
        </Dialog>

      
    </>
  )
}))

export default ChatInfo;