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
import {useSelector} from "react-redux";

const Navbar05Page = () => {
  const user = useSelector((state) => state.auth);
  console.log(user);

  return (

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

            <div className="mr-0 md:mr-5 cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-7"
              >
                <path d="M10 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" />
              </svg>
            </div>

            <DropdownMenu className="w-full h-full">
              <DropdownMenuTrigger className="w-full h-full">
                <img src={`${user.profilePhoto.includes('googleusercontent') || user.profilePhoto == 'NA' ? './assets/user_img.jpg': user.profilePhoto}`} className="rounded-full object-cover h-3/5"/>
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

  );
};

export default Navbar05Page;
