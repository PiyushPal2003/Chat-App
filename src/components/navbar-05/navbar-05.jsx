import axios from "axios";
import { Button } from "@/components/ui/button";
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
import {useSelector} from "react-redux";
import { useEffect } from "react";
import { useGetUserQuery } from "../../Redux/apiRTK/api";

const Navbar05Page = () => {
  const user = useSelector((state) => state.auth);
  // console.log(user);

  const { data, error, isLoading, isSuccess } = useGetUserQuery();

  useEffect(() => {
    if (isSuccess) {
      console.log("Fetched user:", data);
    }
    if (error) {
      console.error("Error fetching user:", error);
    }
  }, [isSuccess, data, error]);


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
              <Dialog>
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
                    <DialogTitle className="text-left">Select users to chat with</DialogTitle>
                    <DialogDescription>
                      {isLoading ? 
                      
                      <div role="status" className="p-2 flex justify-center">
                          <svg aria-hidden="true" class="w-10 h-10 text-gray-200 animate-spin dark:text-gray-600 fill-black" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                          </svg>
                      </div>
                      :
                      data?.Users?.map((ele, index)=>(
                          <div className='flex flex-row h-[2.5rem] items-center my-2 p-1 cursor-pointer w-min whitespace-nowrap' key={index} >
                              <img src={`${ele.profilePhoto.includes('googleusercontent') || ele.profilePhoto == 'NA' ? './assets/user_img.jpg': ele.profilePhoto}`} className='rounded-full object-cover' style={{aspectRatio: '1', height: '95%'}}/>
                              <div className='flex flex-col ml-2'>
                                  <h1 className='font-medium text-lg'>{ele.name}</h1>
                              </div>
                          </div>
                      ))}
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
