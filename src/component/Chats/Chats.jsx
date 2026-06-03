import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGetChatsQuery, useGetUserQuery, useCreateChatMutation, useCreateGroupChatMutation } from "../../Redux/apiRTK/api";
import { useSelector } from "react-redux";
import { getSocket } from "../Context/Socket";
import UserChat from "./UserChat";
import { chatListDateTime } from "../../Utilities";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditProfileMutation } from "../../Redux/apiRTK/api";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

export default function Chats() {
  const navigate = useNavigate();
  const initialRef = useRef(true);
  const { currChat, setCurrChat } = getSocket();
  const [lastMessage, setLastMessage] = useState({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profilePreview, setProfilePreview] = useState(null);
  const [editValues, setEditValues] = useState({ name: "", desc: "" });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGroupMode, setNewGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const user = useSelector((state) => state.auth);
  const [editProfile] = useEditProfileMutation();
  const [createChat] = useCreateChatMutation();
  const [createGroupChat] = useCreateGroupChatMutation();
  const { data, error, isLoading, isSuccess } = useGetChatsQuery(user?.id, { skip: !user?.id });
  const { data: userData } = useGetUserQuery(undefined, { skip: !user?.id });

  const cleanLastMessageText = (text = "") =>
    text.replace("|SystemGenerated|", "").replace("|Forwarded|", "").trim();

  const getChatName = (chat) =>
    chat?.isGroupChat ? chat?.grpname : chat?.members?.find((m) => m._id !== user.id)?.name || "Chat";

  const getChatPhoto = (chat) => {
    if (chat?.isGroupChat) return chat?.photo === "NA" ? "./assets/grp_img.jpg" : chat?.photo;
    const other = chat?.members?.find((m) => m._id !== user.id);
    return other?.profilePhoto === "NA" ? "./assets/user_img.jpg" : other?.profilePhoto;
  };

  const filteredChats = useMemo(() => {
    const all = data?.chats || [];
    if (!searchQuery.trim()) return all;
    const query = searchQuery.toLowerCase();
    return all.filter((chat) => getChatName(chat).toLowerCase().includes(query));
  }, [data?.chats, searchQuery, user.id]);

  const getPreview = (chatId) => {
    const preview = `${cleanLastMessageText(lastMessage[chatId]?.message)}`;
    return preview.length > 24 ? `${preview.slice(0, 24)}...` : preview;
  };

  const profilePhotoSrc = profilePreview || (user?.profilePhoto === "NA" || user?.profilePhoto?.includes("googleusercontent")
    ? "./assets/user_img.jpg"
    : user?.profilePhoto);

  const handleProfilePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setProfilePreview(e.target?.result || null);
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = new FormData();
    const name = formData.get("name")?.toString().trim();
    const desc = formData.get("desc")?.toString().trim();
    const profilePhoto = formData.get("profilePhoto");

    if (profilePhoto && profilePhoto.name) payload.append("profilePhoto", profilePhoto);
    if (name && name !== user?.name) payload.append("name", name);
    if ((desc || "") !== (user?.desc || "")) payload.append("desc", desc || "");

    if ([...payload.keys()].length === 0) {
      setEditMode(false);
      setShowProfileDialog(false);
      return;
    }

    try {
      await editProfile(payload).unwrap();
      setEditMode(false);
      setShowProfileDialog(false);
      setProfilePreview(null);
    } catch (err) {
      console.error("Error editing profile:", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("chatAccessToken");
    navigate("/auth");
  };

  const selectableUsers = useMemo(
    () => (userData?.Users || []).filter((u) => u._id !== user?.id),
    [userData?.Users, user?.id]
  );

  const toggleGroupUser = (id) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createUserChat = async (id) => {
    try {
      const res = await createChat(id).unwrap();
      setCurrChat(res?.chat?._id);
      setShowAddDialog(false);
      setNewGroupMode(false);
      setSelectedUsers(new Set());
    } catch (err) {
      console.error("Create chat failed:", err);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    const grpName = e.currentTarget.grp_name.value.trim();
    const grpDesc = e.currentTarget.grp_desc.value.trim();
    const grpPhoto = e.currentTarget.grpPhoto.files?.[0];
    if (!grpName) return;

    const members = new Set(selectedUsers);
    members.add(user.id);

    const payload = new FormData();
    payload.append("isGroupChat", true);
    payload.append("name", grpName);
    payload.append("adminId", user.id);
    payload.append("members", JSON.stringify(Array.from(members)));
    if (grpDesc) payload.append("grpDesc", grpDesc);
    if (grpPhoto) payload.append("grpPhoto", grpPhoto);

    try {
      const res = await createGroupChat(payload).unwrap();
      setCurrChat(res?.chat?._id);
      setShowAddDialog(false);
      setNewGroupMode(false);
      setSelectedUsers(new Set());
    } catch (err) {
      console.error("Create group failed:", err);
    }
  };

  const renderChatList = (isMobile = false) => (
    <div className={`${isMobile ? "p-2" : "p-2"}`}>
      {filteredChats.map((chat) => (
        <div
          key={chat._id}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-gray-100 ${
            String(currChat) === String(chat._id) ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
          }`}
          onClick={() => {
            setCurrChat(chat._id);
            if (isMobile) setMobileSidebarOpen(false);
          }}
        >
          <img src={getChatPhoto(chat)} className="rounded-full object-cover h-12 w-12" alt={getChatName(chat)} />
          <div className="min-w-0 flex-1">
            <h1 className="font-medium text-[0.95rem] truncate">{getChatName(chat)}</h1>
            <div className="flex justify-between gap-2">
              <span className="text-xs text-gray-600 truncate">{getPreview(chat._id)}</span>
              <span className="text-[11px] text-gray-500 shrink-0">{lastMessage[chat?._id]?.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    if (!isSuccess) return;
    if (initialRef.current) {
      setCurrChat(data?.chats?.[0]?._id);
      initialRef.current = false;
    }
    for (const cht of data?.chats || []) {
      setLastMessage((prev) => ({
        ...prev,
        [cht?._id]: {
          message: cht?.lastMessage,
          time: chatListDateTime(cht?.lastMessageTime),
          isEdited: Boolean(cht?.lastMessageEdited),
        },
      }));
    }
  }, [isSuccess, data?.chats, setCurrChat]);

  useEffect(() => {
    setEditValues({ name: user?.name || "", desc: user?.desc || "" });
  }, [user?.name, user?.desc]);

  if (isLoading) return <div className="h-full w-full grid place-items-center">Loading chats...</div>;
  if (error) return <div className="h-full w-full grid place-items-center">Error loading chats</div>;

  const sidebarHeader = (
    <div className="border-b bg-[#f0f2f5] px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-full">
                <img
                  src={user?.profilePhoto === "NA" ? "./assets/user_img.jpg" : user?.profilePhoto}
                  className="h-9 w-9 rounded-full object-cover"
                  alt="profile"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Hi, {user?.name?.split(" ")?.[0] || "User"}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <Dialog open={showProfileDialog} onOpenChange={(isOpen) => {
                setShowProfileDialog(isOpen);
                if (!isOpen) {
                  setEditMode(false);
                  setProfilePreview(null);
                  setEditValues({ name: user?.name || "", desc: user?.desc || "" });
                }
              }}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Profile & Settings
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="px-6 pt-6">Profile & Settings</DialogTitle>
                    <DialogDescription className="px-6">
                      Manage your account info and profile photo.
                    </DialogDescription>
                  </DialogHeader>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="px-6 pb-6"
                  >
                        <form className="w-full flex flex-col gap-4" onSubmit={handleProfileSave}>
                          {editMode ? (
                            <>
                              <div className="flex items-center justify-center flex-col gap-2">
                                <img src={profilePhotoSrc} className="rounded-full object-cover w-20 h-20 ring-2 ring-white shadow" alt="profile" />
                                <Label htmlFor="profile-photo" className="cursor-pointer text-sm px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">
                                  Update Profile Photo
                                </Label>
                                <input
                                  type="file"
                                  id="profile-photo"
                                  className="hidden"
                                  onChange={handleProfilePhoto}
                                  name="profilePhoto"
                                />
                              </div>

                              <div className="w-full">
                                <Label htmlFor="editName">Name:</Label>
                                <Input
                                  name="name"
                                  className="border rounded p-2 mt-1"
                                  value={editValues.name || ""}
                                  id="editName"
                                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                />
                              </div>

                              <div className="w-full">
                                <Label htmlFor="editDesc">Description:</Label>
                                <Input
                                  name="desc"
                                  className="border rounded p-2 mt-1"
                                  value={editValues.desc || ""}
                                  placeholder="Enter Description"
                                  id="editDesc"
                                  onChange={(e) => setEditValues({ ...editValues, desc: e.target.value })}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2 py-2">
                              <img src={profilePhotoSrc} className="rounded-full object-cover w-24 h-24 ring-2 ring-white shadow" alt="profile" />
                              <p className="text-base md:text-lg text-center"><span className="font-medium">Name:</span> {user?.name}</p>
                              <p className="text-base md:text-lg text-center break-words"><span className="font-medium">Description:</span> {user?.desc ? user?.desc : "- -"}</p>
                            </div>
                          )}

                          {editMode ? (
                            <div className="flex mt-2 gap-2 justify-end w-full">
                              <button type="submit" className="cursor-pointer bg-black text-white px-4 py-2 rounded-md">
                                Save
                              </button>
                              <button
                                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md"
                                type="button"
                                onClick={() => {
                                  setEditMode(false);
                                  setProfilePreview(null);
                                  setEditValues({ name: user?.name || "", desc: user?.desc || "" });
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditMode(true)}
                              className="flex items-center mt-2 bg-black text-white px-4 py-2 rounded-md cursor-pointer ml-auto"
                              type="button"
                            >
                              Edit
                            </button>
                          )}
                        </form>
                  </motion.div>
                </DialogContent>
              </Dialog>

              <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <h2 className="font-semibold truncate">LetsChat</h2>
        </div>
        <Dialog
          open={showAddDialog}
          onOpenChange={(isOpen) => {
            setShowAddDialog(isOpen);
            if (!isOpen) {
              setNewGroupMode(false);
              setSelectedUsers(new Set());
            }
          }}
        >
          <DialogTrigger asChild>
            <button type="button" className="text-gray-700 p-1 rounded hover:bg-white mr-10 lg:mr-0" aria-label="Start new chat">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-6"
              >
                <path d="M10 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" />
              </svg>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{newGroupMode ? "Create Group" : "Select user to chat with"}</DialogTitle>
              <DialogDescription asChild>
                <div className="mt-2">
                  <AnimatePresence mode="wait" initial={false}>
                    {!newGroupMode ? (
                    <motion.div
                      key="select-user"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 p-2 rounded hover:bg-gray-100 text-left"
                        onClick={() => setNewGroupMode(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                          <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clipRule="evenodd" />
                          <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
                        </svg>
                        <span className="font-medium">New Group</span>
                      </button>
                      <div className="max-h-72 overflow-y-auto mt-2">
                        {selectableUsers.map((ele) => (
                          <button
                            key={ele._id}
                            type="button"
                            className="flex w-full items-center gap-2 p-2 rounded hover:bg-gray-100 text-left"
                            onClick={() => createUserChat(ele._id)}
                          >
                            <img
                              src={ele.profilePhoto?.includes("googleusercontent") || ele.profilePhoto === "NA" ? "./assets/user_img.jpg" : ele.profilePhoto}
                              className="rounded-full object-cover h-9 w-9"
                              alt={ele.name}
                            />
                            <span className="font-medium">{ele.name}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="create-group"
                      onSubmit={createGroup}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                    >
                      <div className="max-h-52 overflow-y-auto">
                        {selectableUsers.map((ele) => (
                          <label key={ele._id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer">
                            <img
                              src={ele.profilePhoto?.includes("googleusercontent") || ele.profilePhoto === "NA" ? "./assets/user_img.jpg" : ele.profilePhoto}
                              className="rounded-full object-cover h-9 w-9"
                              alt={ele.name}
                            />
                            <span className="flex-1">{ele.name}</span>
                            <input type="checkbox" checked={selectedUsers.has(ele._id)} onChange={() => toggleGroupUser(ele._id)} />
                          </label>
                        ))}
                      </div>
                      <Label htmlFor="grp_name">Group Name</Label>
                      <input id="grp_name" name="grp_name" className="w-full border rounded p-2 mt-1 mb-2" placeholder="Enter group name..." required />
                      <Label htmlFor="grp_desc">Group Description</Label>
                      <input id="grp_desc" name="grp_desc" className="w-full border rounded p-2 mt-1 mb-2" placeholder="Enter group description..." />
                      <Label htmlFor="grp-photo" className="cursor-pointer text-sm hover:underline">Upload Group Photo</Label>
                      <input type="file" id="grp-photo" name="grpPhoto" className="hidden" />
                      <div className="mt-3 flex gap-2 justify-end">
                        <button type="button" className="px-3 py-1 bg-gray-300 rounded" onClick={() => setNewGroupMode(false)}>
                          Back
                        </button>
                        <button type="submit" className="px-3 py-1 bg-green-500 text-white rounded" disabled={selectedUsers.size < 2}>
                          Create
                        </button>
                      </div>
                    </motion.form>
                  )}
                  </AnimatePresence>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-lg bg-white px-3 py-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search or start new chat"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-[#111b21]">
      {data?.chats?.length === 0 ? (
        <div className="h-full flex items-center justify-center text-center px-4 bg-white">
          <div>
            <h1 className="font-bold text-2xl mb-3">No Chats Found</h1>
            <p>Start a new chat by clicking on the user icon.</p>
          </div>
        </div>
      ) : (
        <div className="h-full grid grid-cols-1 lg:grid-cols-[370px_1fr]">
          <aside className="hidden lg:flex flex-col bg-white border-r">
            {sidebarHeader}
            <div className="flex-1 overflow-y-auto">{renderChatList(false)}</div>
          </aside>

          <div className="relative h-full bg-gray-300">
            <button
              type="button"
              className="lg:hidden absolute top-2 left-2 z-20 bg-white border rounded-full p-2 shadow"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open chat list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <UserChat currChatId={currChat} setLastMessage={setLastMessage} />
          </div>

          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="w-[88%] p-0 sm:max-w-sm">
              <SheetHeader className="sr-only">
                <SheetTitle>Chats</SheetTitle>
              </SheetHeader>
              {sidebarHeader}
              <div className="flex-1 overflow-y-auto bg-white">{renderChatList(true)}</div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
