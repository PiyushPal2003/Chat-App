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
