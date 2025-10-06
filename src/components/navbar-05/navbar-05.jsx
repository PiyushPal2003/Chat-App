import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Logo } from "./logo";
import { Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {useSelector} from "react-redux";
import toast, { Toaster } from 'react-hot-toast';
import {getSocket} from "../../component/Context/Socket"
import { useGetUserQuery, useCreateChatMutation, useCreateGroupChatMutation} from "../../Redux/apiRTK/api";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Navbar05Page = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth);
  const {setCurrChat} = getSocket();
  const [open, setOpen] = useState(false);
  const [groupChat, setGroupChat] = useState(false);
  const [step, setStep] = useState(0);
  const [mySet, setMySet] = useState(new Set());

  const { data: userData, error: userError, isLoading: userLoading, isSuccess: userSuccess } = useGetUserQuery();
  const [createChat, { data: createUserData, error: createuserError, isLoading: createUserLoading, isSuccess: createUserSuccess }] = useCreateChatMutation();
  const [createGroupChat] = useCreateGroupChatMutation();

  function handleProfilePhoto(event) {
    const file = event.target.files[0];
    console.log(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.querySelector('#grp_photo').src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  function addUsers(e) {
    const value = e.target.value;

    setMySet(prevSet => {
      const newSet = new Set(prevSet);
      newSet.add(user.id);

      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }

      return newSet;
    });

    console.log("Selected users:", mySet);
  }

  async function createUserChat(id){
    try{
      createChat(id).unwrap()
      .then((res) => {
        console.log("Chat created successfully:", res);
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
        }
      });
    }
    catch(err){
      console.log(err);
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
  }

  async function createGroup(e){
    e.preventDefault();
    const grpName = document.getElementById('grp_name').value.trim();
    const grpPhoto = document.getElementById('grp-photo').files[0];
    const grpDesc = document.getElementById('grp_desc')?.value.trim();

    const payload = new FormData();
    payload.append("isGroupChat", true);
    payload.append("name", grpName);
    payload.append("adminId", user.id);
    payload.append("members", JSON.stringify(Array.from(mySet)));
    if(grpPhoto) {
      payload.append("grpPhoto", grpPhoto)
    }
    else{
      payload.append("grpPhoto", 'NA');
    };
    if(grpDesc) payload.append("description", grpDesc);

    try{

      createGroupChat(payload).unwrap()
      .then((res) => {
        console.log("Chat created successfully:", res);
        setCurrChat(res.chat._id);
        toast.success(
          <div>
            <p className="font-bold">Group Chat Created</p>
          </div>,
          {
            duration: 2200,
            position: 'top-center',
          }
        );
      })
    }
    catch(err){
      console.log(err);
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
  }

  useEffect(() => {
    if (userSuccess) {
      console.log("Fetched user:", userData);
    }
    if (userError) {
      console.log("Error fetching user:", userError);
      // if(userError?.status === 401){
        if(localStorage.getItem("chatAccessToken")){
          localStorage.removeItem("chatAccessToken");
        }
        navigate('/auth');
      // }
    }
  }, [userSuccess, userData, userError]);


  return (
    <>
      <nav
        className="inset-x-4 h-16 bg-background border dark:border-slate-700/70 mx-auto drop-shadow-lg" style={{borderRadius: "0 0 1.5rem 1.5rem"}}>
        <div className="h-full flex items-center justify-between mx-auto px-4">
          <div className="flex items-center gap-2 md:gap-6">
            <Logo className="shrink-0" />

            <div className="relative md:block">
              <Search className="h-5 w-5 absolute inset-y-0 my-auto left-2.5" />
              <Input
                className="pl-10 flex-1 bg-slate-100/70 dark:bg-slate-800 border-none shadow-none w-[150px] md:w-[280px] rounded-full"
                placeholder="Search" />
            </div>
          </div>

          <div className="flex items-center gap-2 h-full">

            <div className="mr-0 md:mr-5">
              <Dialog open={open} 
                onOpenChange={(isOpen) => {
                if (!isOpen) setMySet(new Set());
                setOpen(isOpen)
                console.log("Dialog open state:", mySet);
                }}
                >
                <DialogTrigger className="cursor-pointer">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-7"
                    >
                    <path d="M10 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" />
                  </svg>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-left">Select user to chat with</DialogTitle>
                    <DialogDescription asChild>
                      <div className="relative overflow-hidden">
                        <AnimatePresence mode="wait">
                          {step === 0 && (
                            <motion.div
                              key="step0"
                              initial={{ x: 300, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              exit={{ x: -300, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {/* STEP 0: Options */}
                              <div
                                className="flex flex-row h-[2.5rem] items-center my-2 p-1 cursor-pointer"
                                onClick={() => setStep(1)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                  <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clipRule="evenodd" />
                                  <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
                                </svg>

                                <p className="ml-2 font-medium text-lg">New Group</p>
                              </div>

                              {userData?.Users?.map((ele, i) => (
                                <div
                                  key={i}
                                  className="flex flex-row h-[2.5rem] items-center my-2 p-1 cursor-pointer"
                                  onClick={() => createUserChat(ele._id)}
                                >
                                  <img
                                    src={`${ele.profilePhoto.includes("googleusercontent") || ele.profilePhoto == "NA" ? "./assets/user_img.jpg" : ele.profilePhoto}`}
                                    className="rounded-full object-cover"
                                    style={{ aspectRatio: "1", height: "95%" }}
                                  />
                                  <p className="ml-2 font-medium text-lg">{ele.name}</p>
                                </div>
                              ))}
                            </motion.div>
                          )}

                          {step === 1 && (
                            <motion.div
                              key="step1"
                              initial={{ x: 300, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              exit={{ x: -300, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {/* STEP 1: Select Users */}
                              {userData?.Users?.map((ele, i) => (
                                <>
                                <label
                                  key={i}
                                  className="flex flex-row h-[2.5rem] items-center my-1 p-1 cursor-pointer"
                                  >
                                  <img
                                    src={`${
                                      ele.profilePhoto.includes("googleusercontent") || ele.profilePhoto == "NA"
                                        ? "./assets/user_img.jpg"
                                        : ele.profilePhoto
                                    }`}
                                    className="rounded-full object-cover"
                                    style={{ aspectRatio: "1", height: "95%" }}
                                  />
                                  <p className="ml-2 font-medium text-lg">{ele.name}</p>
                                  <input
                                    type="checkbox"
                                    className="ml-auto h-5/10 aspect-square"
                                    value={ele._id}
                                    onChange={addUsers}
                                    />
                                </label>
                                {i != userData?.Users?.length-1 ? <hr/> : ''}
                                </>
                              ))}
                              <div className="flex justify-end">
                                <button
                                  className={`mt-3 px-3 py-1 bg-black text-white rounded cursor-pointer ${mySet.size < 3 ? 'disabled:cursor-not-allowed disabled:opacity-50' : ''}`}
                                  onClick={() => setStep(2)}
                                  disabled={mySet.size < 3}
                                  >
                                  Next
                                </button>
                                <button className="ml-3 mt-3 px-3 py-0 bg-gray-300 rounded cursor-pointer" onClick={() => setStep(0)}>
                                  Back
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {step === 2 && (
                            <motion.div
                              key="step2"
                              initial={{ x: 300, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              exit={{ x: -300, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {/* STEP 2: Enter Group Name */}
                              <form>
                                <div className="flex items-center justify-center flex-col">
                                  <img id="grp_photo" src="./assets/grp_img.jpg" className="w-17 h-17 rounded-full object-cover"/>
                                  <Label htmlFor="grp-photo" className="cursor-pointer text-sm hover:underline">Upload Group Photo</Label>
                                  <input type="file" id="grp-photo" className="hidden" placeholder="Upload Group Photo" name="grpPhoto" onChange={handleProfilePhoto}/>
                                </div>

                                <label for="grp_name" >Group Name</label>
                                <input id="grp_name" className="w-full border rounded p-2 mt-2" placeholder="Enter group name..." required/>

                                <label for="grp_desc" >Group Description</label>
                                <input id="grp_desc" className="w-full border rounded p-2 mt-2" placeholder="Enter group description..." />

                                <p className="text-center text-xs font-semibold" >Initail Admin will be user creating the group, which can be changed in settings</p>

                                <div className="mt-4 flex space-x-2">
                                  <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setStep(1)}>
                                    Back
                                  </button>
                                  <button type="submit" className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded" onClick={createGroup}>
                                    Create Group
                                  </button>
                                </div>
                              </form>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>

            <DropdownMenu className="w-full h-full">
              <DropdownMenuTrigger className="w-full h-full">
                <img src={`${user.profilePhoto.includes('googleusercontent') || user.profilePhoto == 'NA' ? './assets/user_img.jpg': user.profilePhoto}`} className="rounded-full object-cover h-3/5" style={{aspectRatio: '1', height: '70%'}}/>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Hi, {user.name.split(' ')[0]}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Setting</DropdownMenuItem>
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>


      {/* <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog> */}

    </>
  );
};

export default Navbar05Page;
