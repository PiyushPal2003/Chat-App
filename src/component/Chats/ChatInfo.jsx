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
import { useEditGroupMutation } from '../../Redux/apiRTK/api';

const ChatInfo = React.memo(React.forwardRef(({data, user, open, setOpen, allMessages, setAllMessages}, ref)=>{

    const [editValues, setEditValues] = useState({
        grpname: data?.chat?.grpname,
        grpdesc: data?.chat?.description,
    });
    const [showDialog, setShowDialog] = useState(false);
    const dialogRef = useRef(null);
    const usr = useSelector((state)=>state.auth);
    const [editGroupChat] = useEditGroupMutation();
    // console.log(usr);

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
        //commenting the grpname check because name is mandatory field on backend
        // if (grpname && grpname !== data?.chat?.grpname) {
        payload.append("name", grpname);
        // }
        payload.append("convoId", data?.chat?._id);
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

              setShowDialog(false);
            })
            .catch((err) => {
              console.error("Error editing profile:", err);
            });
        }
    }


  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      const clickedInsideDrawer = ref.current && ref.current.contains(event.target);
      const clickedInsideDialog = event.target.closest('[role="dialog"]');

      if (!clickedInsideDrawer && !clickedInsideDialog) {
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
      >
        <div className='relative w-full h-full p-5 rounded-tl-3xl rounded-tr-3xl bg-[#ebebeb]'>

            {data?.chat?.admin?.includes(usr?.id) && <button
                onClick={() => setShowDialog(true)}
                className="absolute top-5 right-5 flex items-center bg-black text-white px-2 py-1 rounded cursor-pointer ml-auto text-xs"
                type="button"
            >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>{" "}
                Edit
            </button>}
        
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
              {/* <p className='text-center text-gray-600'>{!data?.chat?.isGroupChat && data?.chat?.members?.filter(member => member._id !== user.id)[0]?.email}</p> */}
            </div>
            {data?.chat?.description && <h1 className='text-center'><span className='font-semibold'>Description</span>: {data?.chat?.description}</h1>}

            <div>
                <h1 className='text-start font-semibold'>Group Members:</h1>
                <div className='grid grid-cols-1 mt-2 md:m-0 md:grid-cols-2 lg:grid-cols-3 gap-1 md:gap-3'>
                    {data?.chat?.members?.map((member, index)=>(
                        <div key={index} className='relative flex items-center gap-3 my-0 md:my-1 p-2 rounded-lg bg-[#d8d8d8]'>
                            <img src={member.profilePhoto=='NA' ? './assets/user_img.jpg' : member.profilePhoto} className='h-12 rounded-full object-cover' style={{aspectRatio: '1/1'}} />
                            <div className='flex flex-col'>
                                <h1 className=''>{member.name}</h1>
                                <h1 className='text-sm'>{member.email}</h1>
                                <h1 className='text-sm'>{member.desc || ''}</h1>
                            </div>
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
                data?.chat?.members?.filter(member => member._id !== user.id)[0]?.profilePhoto
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


    
        <Dialog ref={dialogRef} open={showDialog} onOpenChange={(issOpen) => {
            setShowDialog(issOpen)
            }}>
            <DialogContent className="w-xl">
              <DialogHeader>
                <DialogTitle>Update Chat Details</DialogTitle>
                <DialogDescription>
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
                          onClick={() => {
                            setEditValues({ grpname: data?.chat?.grpname, grpdesc: user?.description });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                            
                    </form>
                    </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
        </Dialog>

      
    </>
  )
}))

export default ChatInfo;