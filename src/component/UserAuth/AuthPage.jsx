import { GalleryVerticalEnd } from "lucide-react"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left Section */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* Logo (Mobile Only) */}
        <div className="flex justify-center lg:hidden">
          <img
            src="/assets/Lets_Chat_TextLogo.png"
            alt="Let's Chat Logo"
            className="mt-10 h-6 w-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </div>

        {/* Uncomment if you want the brand name */}
        {/*
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Acme Inc.
          </a>
        </div>
        */}

        {/* Login Form */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Right Section (Desktop Only) */}
      <div className="bg-muted relative hidden lg:flex items-center justify-center">
        <img
          src="/assets/Lets_Chat_Logo.png"
          alt="Let's Chat Logo"
          className="h-[40%] w-auto object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>
    </div>
  )
}