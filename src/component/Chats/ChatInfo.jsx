import React, {useEffect, useState, useRef} from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input";
import Swal from 'sweetalert2';
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
import api, { useEditGroupMutation, useCreateChatMutation } from '../../Redux/apiRTK/api';
import { motion } from "framer-motion";

const ChatInfo = React.memo(({data, user, open, setOpen, allMessages, setAllMessages})=>{

    const [editValues, setEditValues] = useState({
        grpname: data?.chat?.grpname,
        grpdesc: data?.chat?.description,
    });
    const dispatch = useDispatch();
    const membersIds = (data?.chat?.members || []).map((m) => m._id);
    const [showEditDialog, setshowEditDialog] = useState(false);
    const [showAddUserDialog, setshowAddUserDialog] = useState(false);
    const [mySet, setMySet] = useState(new Set([]));
    const {currChat, setCurrChat} = getSocket();
    const ref = useRef();
    const usr = useSelector((state)=>state.auth);
    const usrData = useSelector((state) => state.api?.queries?.['getUser(undefined)']?.data?.Users || []);
    const usrListData = usrData.filter((usr) => !membersIds.includes(usr._id));
    console.log(usrListData);
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

    function addUsers(e) {
      const value = e.target.value;

      setMySet(prevSet => {
        const newSet = new Set(prevSet);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        return newSet;
      });
      console.log("Selected users:", [...mySet]);
    }

    function addUserSubmit(e){
      e.preventDefault();
      const payload = new FormData();
      payload.append('members', JSON.stringify([...mySet]));
      payload.append('convoId', data?.chat?._id);

      editGroupChat(payload).unwrap()
        .then((res) => {
          console.log("Users added successfully", res.chat);
          // dispatch(
          //   api.util.updateQueryData(
          //     "fetchMessages",
          //     { id: data?.chat?._id, lastMessageId: "" },
          //     (draft) => {
          //       console.log("Draft before update:", draft);
          //       if (!draft) return;
          //       draft.messages.push(res.chat);
          //     }
          //   )
          // );
          setAllMessages((prev)=>(
            [...prev, res.chat]
          ));
        })
    }

    function makeAdmin(id, name) {
      const payload = new FormData();
      payload.append("convoId", data?.chat?._id);
      payload.append("admin", JSON.stringify({id: id, name: name}));
      payload.append("user", usr?.name);

      Swal.fire({
        title: "Are you sure?",
        // text: "You want to promote this user to admin.",
        html: `<p>You want to promote <strong>${name}</strong> to admin.</p>`,
        icon: "warning",
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: "Confirm",
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          editGroupChat(payload)
          .unwrap()
          .then((res) => {
            console.log("Profile edited successfully:", res);
            setAllMessages((prev)=>(
              [...prev, res.chat]
            ));
          });
        }
      });
    }

    function removeUser(id){
      const payload = new FormData();
      payload.append('rm', id);
      payload.append('convoId', data?.chat?._id);

      Swal.fire({
        title: "Are you sure?",
        text: "You want to remove this user from the group.",
        icon: "warning",
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: "Confirm",
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          editGroupChat(payload).unwrap()
          .then((res) => {
            console.log("User removed successfully", res);
            setAllMessages((prev)=>(
              [...prev, res.chat]
            ));
          })
        }
      });
    }

    function leaveGroup(id){
      const payload = new FormData();
      payload.append('leave', id);
      payload.append('convoId', data?.chat?._id);

      Swal.fire({
        title: "You are about to leave the group",
        icon: "warning",
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: "Confirm",
        cancelButtonText: `Cancel`
      }).then((result) => {
        if (result.isConfirmed) {
          editGroupChat(payload).unwrap()
          .then((res) => {
            dispatch(api.util.invalidateTags(['Chats']));
            console.log("You left the group successfully", res);
            setAllMessages((prev)=>(
              [...prev, res.chat]
            ));
          })
        }
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
              setAllMessages((prev)=>(
                [...prev, res.chat]
              ));

              // const date = new Date(res.chat.timestamp).toDateString();
              // if(!allMessages[date]){
              //   setAllMessages((prev)=>
              //       ({...prev, [date]: []})
              //   );
              // }
              // setAllMessages((prev)=>(
              //   {...prev, [date]: [...prev[date], res.chat]}
              // ));

              setshowEditDialog(false);
            })
            .catch((err) => {
              console.error("Error editing profile:", err);
            });
        }
    }

    const convoMedia = data?.convoAttachment || data?.convoAttachments || [];
    const getAttachmentName = (url) => {
      const raw = url?.split("_").pop() || "Attachment";
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    };

// console.log('open state in chat info:', open);
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (!(event.target instanceof Element)) return;
      console.log('Click event target:', event.target);
      document.body.style.pointerEvents = 'auto';
      const insideDialogOverlay = event.target.closest('[data-slot="dialog-overlay"]');
      // const insideDialog = dialogRef.current && dialogRef.current.contains(event.target);
      const clickedInsideDrawer = ref.current && ref.current.contains(event.target);
      const htmlTagClicked = event.target === document.documentElement
      const clickedInsideDialog = event.target.closest('[role="dialog"]');
      const clickedInsideDropdown = event.target.closest('[role="menu"]');
      const clickedInsideSwal = event.target.closest('.swal2-container, .swal2-popup');
      const chatinfoclicked = event.target.className?.baseVal?.includes('chatinfo-icon') 

      if (!clickedInsideDrawer && !htmlTagClicked && !clickedInsideDropdown && !clickedInsideDialog && !insideDialogOverlay && !clickedInsideSwal && !chatinfoclicked) {
          setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
    
    {data?.chat?.isGroupChat ? 
      (<div
        className='w-full h-full bg-white' id='settingDrawer'
        ref={ref}
        // onMouseDown={(e) => {e.stopPropagation();}}
      >
        <div className='relative w-full h-full p-5 bg-[#ebebeb] overflow-y-auto overflow-x-hidden'>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 left-3 rounded-full px-2 py-1 text-sm bg-white/80 hover:bg-white z-30"
              aria-label="Close chat info"
            >
              ✕
            </button>
             
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
                  <DropdownMenuItem onClick={() => setshowAddUserDialog(true)}>
                    Add Users
                  </DropdownMenuItem>
                  </>
                  }
                  <DropdownMenuItem onClick={() => leaveGroup(usr?.id)}>
                    Leave Group
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
        
            <div className='md:h-[12%] my-5 flex flex-col md:flex-row items-center justify-center gap-5 min-w-0'>
              <img src={
                data?.chat?.photo == 'NA' ? './assets/grp_img.jpg' : data?.chat?.photo
              } 
              className='rounded-full object-cover h-22 md:h-full'
              style={{aspectRatio: '1/1'}}
            />
              <div className='flex flex-col items-center md:items-start gap-1 min-w-0 w-full'>
                <h1 className='font-medium text-xl text-center md:text-left truncate w-full'>{data?.chat?.grpname}</h1>
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
            {data?.chat?.description && <h1 className='text-center break-words'><span className='font-semibold'>Description</span>: {data?.chat?.description}</h1>}

            <div>
                <h1 className='text-start font-semibold'>Group Members:</h1>
                <div className='grid grid-cols-1 mt-2 md:m-0 gap-2'>
                    {data?.chat?.members?.map((member, index)=>(
                        <div key={index} className='relative flex justify-between items-center rounded-lg bg-[#d8d8d8] min-w-0 overflow-hidden'>
                            <div className='flex items-center gap-3 my-0 md:my-1 p-2 min-w-0'>
                              <img src={member.profilePhoto=='NA' ? './assets/user_img.jpg' : member.profilePhoto} className='h-12 rounded-full object-cover' style={{aspectRatio: '1/1'}} />
                              <div className='flex flex-col min-w-0'>
                                  <h1 className='truncate'>{member.name}</h1>
                                  <h1 className='text-sm truncate'>{member.email}</h1>
                                  <h1 className='text-sm break-words'>{member.desc || ''}</h1>
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
                                  {!data?.chat?.admin?.includes(member?._id) &&
                                    <DropdownMenuItem onClick={() => {makeAdmin(member._id, member.name)}}>
                                      Make Admin
                                    </DropdownMenuItem>
                                  }
                                  <DropdownMenuItem onClick={()=>removeUser(member._id)}>
                                    Remove
                                  </DropdownMenuItem>
                                  </>
                                  }
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>}

                            {data?.chat?.admin?.includes(member._id) && <span className='absolute top-1 right-1 px-2 py-0.5 rounded-md font-semibold text-xs bg-amber-200'>Admin</span>}
                        </div>
                    ))
                    }
                </div>
            </div>

            <div className='mt-5'>
                <h1 className='text-start font-semibold'>Media:</h1>
                <div className='mt-2 flex flex-col gap-2'>
                  {convoMedia.length > 0 ? (
                    convoMedia.map((fileUrl, idx) => (
                      <a
                        key={`${fileUrl}-${idx}`}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className='rounded-md bg-[#d8d8d8] px-3 py-2 text-sm truncate hover:bg-[#cecece]'
                      >
                        {getAttachmentName(fileUrl)}
                      </a>
                    ))
                  ) : (
                    <p className='text-sm text-gray-600'>No media shared yet.</p>
                  )}
                </div>
            </div>
    
        </div>
      </div>)
        :
      (<div 
            className='w-full h-full bg-white' id='settingDrawer'
            ref={ref}
        >
        <div className='relative w-full h-full bg-[#ebebeb] overflow-y-auto p-5'>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 left-3 rounded-full px-2 py-1 text-sm bg-white/80 hover:bg-white z-30"
              aria-label="Close chat info"
            >
              ✕
            </button>
            <div className='w-full flex flex-col items-center gap-2'>
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

              <div className='mt-4 w-full'>
                <h1 className='text-start font-semibold'>Media:</h1>
                <div className='mt-2 flex flex-col gap-2'>
                  {convoMedia.length > 0 ? (
                    convoMedia.map((fileUrl, idx) => (
                      <a
                        key={`${fileUrl}-${idx}`}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className='rounded-md bg-[#d8d8d8] px-3 py-2 text-sm truncate hover:bg-[#cecece]'
                      >
                        {getAttachmentName(fileUrl)}
                      </a>
                    ))
                  ) : (
                    <p className='text-sm text-gray-600'>No media shared yet.</p>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>)
      }


    
        <Dialog open={showEditDialog} onOpenChange={(issOpen) => {setshowEditDialog(issOpen)}}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="px-6 pt-6">Update Chat Details</DialogTitle>
                <DialogDescription className="px-6">
                  Update your group's name, description, and profile photo.
                </DialogDescription>
              </DialogHeader>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="px-6 pb-6"
                  >
                    <form className="w-full flex flex-col gap-4" onSubmit={grpEditSubmit}>
                      <div className="flex items-center justify-center flex-col gap-2">
                        <img
                          src={
                            data?.chat?.photo == 'NA' ? './assets/grp_img.jpg' : data?.chat?.photo
                          }
                          className="rounded-full object-cover w-20 h-20 ring-2 ring-white shadow"
                          id="editImg"
                        />
                        <Label htmlFor="profile-photo" className="cursor-pointer text-sm px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">
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

                      <div className="w-full">
                        <Label htmlFor="editName">Group Name:</Label>
                        <Input
                          name="name"
                          className="border rounded p-2 mt-1"
                          value={editValues.grpname || ""}
                          placeholder="Enter Group Name"
                          id="editName"
                          onChange={(e) => setEditValues({ ...editValues, grpname: e.target.value })}
                        />
                      </div>

                      <div className="w-full">
                        <Label htmlFor="editDesc">Group Description:</Label>
                        <Input
                          name="desc"
                          className="border rounded p-2 mt-1"
                          value={editValues.grpdesc || ""}
                          placeholder="Enter Description"
                          id="editDesc"
                          onChange={(e) => setEditValues({ ...editValues, grpdesc: e.target.value })}
                        />
                      </div>
                            
                      <div className="flex mt-2 gap-2 justify-end w-full">
                        <button type="submit" className="cursor-pointer bg-black text-white px-4 py-2 rounded-md">
                          Save
                        </button>
                        <button
                          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md"
                          type="button"
                          onClick={closeEditDialog}
                        >
                          Cancel
                        </button>
                      </div>
                            
                    </form>
                  </motion.div>
            </DialogContent>
        </Dialog>
        
        <Dialog open={showAddUserDialog} onOpenChange={(isssOpen) => 
          {
            if (!isssOpen) setMySet(new Set());
            setshowAddUserDialog(isssOpen)
          }}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="px-6 pt-6">Add Users</DialogTitle>
                <DialogDescription className="px-6">
                  Add users to your group.
                </DialogDescription>
              </DialogHeader>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="px-6 pb-6"
                  >
                    <form onSubmit={addUserSubmit} className="w-full flex flex-col gap-3" >
                      <div className="max-h-72 overflow-y-auto rounded-lg border bg-gray-50 p-2">
                      {usrListData?.length>0 ? ( usrListData.map((ele, i) => (
                          <React.Fragment key={ele._id}>
                          <label
                            className="flex flex-row min-h-[2.75rem] items-center my-1 px-2 py-1.5 cursor-pointer rounded-md hover:bg-white"
                            >
                            <img
                              src={`${
                                ele.profilePhoto?.includes("googleusercontent") || ele.profilePhoto == "NA"
                                  ? "./assets/user_img.jpg"
                                  : ele.profilePhoto
                              }`}
                              className="rounded-full object-cover h-9 w-9"
                            />
                            <p className="ml-2 font-medium text-base truncate">{ele.name}</p>
                            <input
                              type="checkbox"
                              className="ml-auto h-4 w-4"
                              value={ele._id}
                              onChange={addUsers}
                              />
                          </label>
                          {i != usrListData?.length-1 ? <hr className="border-gray-200"/> : ''}
                          </React.Fragment>
                      ))
                      ):
                      <p className="p-2 text-sm text-gray-600">No users to add</p>
                      }
                      </div>
                            
                      <div className="flex mt-2 gap-2 justify-end w-full">
                        <button type="submit" className="cursor-pointer bg-black text-white px-4 py-2 rounded-md">
                          Confirm
                        </button>
                        <button
                          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md"
                          type="button"
                          onClick={()=>{
                            setshowAddUserDialog(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                            
                    </form>
                  </motion.div>
            </DialogContent>
        </Dialog>

      
    </>
  )
})

export default ChatInfo;
