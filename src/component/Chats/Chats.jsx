import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGetChatsQuery } from "../../Redux/apiRTK/api";
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
  const user = useSelector((state) => state.auth);
  const [editProfile] = useEditProfileMutation();
  const { data, error, isLoading, isSuccess } = useGetChatsQuery(user?.id, { skip: !user?.id });

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
    const preview = `${lastMessage[chatId]?.isEdited ? "(edited) " : ""}${cleanLastMessageText(lastMessage[chatId]?.message)}`;
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
                <DialogContent className="w-xl">
                  <DialogHeader>
                    <DialogTitle>Profile & Settings</DialogTitle>
                    <DialogDescription>
                      <div className="flex flex-col items-center mt-4 gap-1">
                        <form className="w-full flex flex-col items-center" onSubmit={handleProfileSave}>
                          {editMode ? (
                            <>
                              <div className="flex items-center justify-center flex-col">
                                <img src={profilePhotoSrc} className="rounded-full object-cover w-20 h-20" alt="profile" />
                                <Label htmlFor="profile-photo" className="cursor-pointer text-sm hover:underline">
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

                              <div className="items-center w-6/10">
                                <Label htmlFor="editName">Name:</Label>
                                <Input
                                  name="name"
                                  className="border rounded p-2"
                                  value={editValues.name || ""}
                                  id="editName"
                                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                />
                              </div>

                              <div className="items-center w-6/10">
                                <Label htmlFor="editDesc">Description:</Label>
                                <Input
                                  name="desc"
                                  className="border rounded p-2"
                                  value={editValues.desc || ""}
                                  placeholder="Enter Description"
                                  id="editDesc"
                                  onChange={(e) => setEditValues({ ...editValues, desc: e.target.value })}
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <img src={profilePhotoSrc} className="rounded-full object-cover w-24 h-24" alt="profile" />
                              <p className="text-lg">Name: {user?.name}</p>
                              <p className="text-lg">Description: {user?.desc ? user?.desc : "- -"}</p>
                            </>
                          )}

                          {editMode ? (
                            <div className="flex mt-4 gap-2 justify-end w-full">
                              <button type="submit" className="cursor-pointer bg-black text-white px-3 py-1 rounded">
                                Save
                              </button>
                              <button
                                className="bg-gray-300 px-3 py-1 rounded"
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
                              className="flex items-center mt-4 bg-black text-white px-3 py-1 rounded cursor-pointer ml-auto"
                              type="button"
                            >
                              Edit
                            </button>
                          )}
                        </form>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <h2 className="font-semibold truncate">LetsChat</h2>
        </div>
        {/* <button type="button" className="text-gray-600 text-xs">Chats</button> */}
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
