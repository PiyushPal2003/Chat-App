import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useRef } from "react";
import {useDispatch} from "react-redux";
import toast, { Toaster } from 'react-hot-toast';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { login } from "../Redux/Reducers/authSlice";
import {useNavigate} from "react-router-dom";
import axios from "axios";
import { getSocket } from "../component/Context/Socket";

export function LoginForm({
  className,
  ...props
}) {

  const socket = getSocket()
  const [authState, setAuthState] = useState('Login');
  const [passVisible, setPassVisible] = useState(false);
  const [authType, setAuthType] = useState('Login');
  const submitRefbtn = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function changeAuthState() {
    submitRefbtn.current.disabled = false;
    setAuthState((prev)=> prev === 'Login' ? 'Sign up' : 'Login');
    setAuthType(authState === 'Login' ? 'Sign up' : 'Login');
  }

  function toggleEye() {
    setPassVisible((prev) => !prev);
  }

  function handleProfilePhoto(event) {
    const file = event.target.files[0];
    console.log(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.querySelector('img').src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }


  //Register Handlers
  function registerFormSubmit(event) {
    event.preventDefault();
    submitRefbtn.current.disabled = true;
    
    const formData = new FormData(event.target);
    const profilePhoto = formData.get('profilePhoto');

    const isDummyPhoto = profilePhoto && profilePhoto.name === "user_img.jpg";

    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
      type: authType,
    };

    //if sign up, these name and profile photo will be added to payload
    if (authType === 'Sign up') {
      data.name = formData.get('name');
    }
    if (!isDummyPhoto && profilePhoto && profilePhoto.name) {
      data.profilePhoto = profilePhoto;
    }

    axios.post( 'http://localhost:5000/api/auth/register' , data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true
    })
    .then((response) => {
      console.log('Successfully Created User -- Response:', response);

        if(response.status == 200){
          toast.success(
            <div>
              <p className="font-bold">Thankyou for Registering</p>
              <p>Welcome to</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );

          dispatch(login(response.data.user));
          localStorage.setItem('chatAccessToken', JSON.stringify(response.data.accessToken));
          navigate('/');
        }
        else if(response.status == 201){
          toast('You\'ve already registered', {
            icon: '⚠️',
          });
        }

    })
    .catch((error) => {
      console.log('Error Creating User -- Error:', error);
        if(error.response.status == 400){
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
        else if(error.response.status == 500){
          toast.error(
            <div>
              <p className="font-bold">Server Error!</p>
              <p>Please try again after some time.</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );
        }

      submitRefbtn.current.disabled = false;
      console.error('Error Creating User -- Error:', error);
      // alert("Error creating user: " + error.response.data.error);
    });
  }

  const googleSignUp = (res)=>{
    submitRefbtn.current.disabled = true;
    console.log('Google Sign Up:', res);

      axios.post('http://localhost:5000/api/auth/googleregister', {googleAuthToken: res}, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      }
      ).then((response) => {
        console.log('Successfully created user with google signup -- Response:', response.data);

        if(response.status == 200){
          toast.success(
            <div>
              <p className="font-bold">Thankyou for Registering</p>
              <p>Welcome to</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );

          dispatch(login(response.data.user));
          localStorage.setItem('chatAccessToken', JSON.stringify(response.data.accessToken));
          navigate('/');
        }
        else if(response.status == 201){
          toast('You\'ve already registered', {
            icon: '⚠️',
          });
        }

      }).catch((error) => {
        console.log('Error Creating User -- Error:', error);
        if(error.response.status == 400){
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
        else if(error.response.status == 500){
          toast.error(
            <div>
              <p className="font-bold">Server Error!</p>
              <p>Please try again after some time.</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );
        }

        submitRefbtn.current.disabled = false;
        console.error('Error Creating User with Google SignUp -- Error:', error);
        alert("Error creating user: " + error.response.data.error);
      });
  }


  
  //Login Handlers
  function loginFormSubmit(e){
    e.preventDefault();
    submitRefbtn.current.disabled = true;

    const data = {
      email: e.target.email.value,
      password: e.target.password.value
    }

    axios.post('http://localhost:5000/api/auth/login', data, {
      headers:{
        "Content-Type": 'application/JSON'
      },
      withCredentials: true
    })
    .then((response)=>{
      console.log("Login Successfull", response);

        if(response.status == 200){
          toast.success(
            <div>
              <p className="font-bold">Login Successfull</p>
              <p>Welcome back!!</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );

          dispatch(login(response.data.user));
          localStorage.setItem('chatAccessToken', JSON.stringify(response.data.token));
          navigate('/');
        }
        else if(response.status == 201){
          toast('Use other login method', {
            icon: '⚠️',
          });
        }

    })
    .catch((error)=>{
      console.log('Error Creating User -- Error:', error);
      if(error.response.status == 400 || error.response.status == 401){
        toast.error(
          <div>
            <p className="font-bold text-center">User Not Found!</p>
            <p className="text-center">Please Signup.</p>
          </div>,
          {
            duration: 3000,
            position: 'top-center',
          }
        );
      }
      else if(error.response.status == 500){
        toast.error(
          <div>
            <p className="font-bold text-center">Server Error!</p>
            <p>Please try again after some time.</p>
          </div>,
          {
            duration: 3000,
            position: 'top-center',
          }
        );
      }

      submitRefbtn.current.disabled = false;
      console.error('Error Logging in User -- Error:', error);
    })
  }

  const googleSignIn = (res)=>{
    submitRefbtn.current.disabled = true;
    console.log('Google Sign In:', res);

      axios.post('http://localhost:5000/api/auth/googlelogin', {googleAuthToken: res}, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      }
      ).then((response) => {
        console.log('Successfully Logged in user with google signin -- Response:', response.data);

        if(response.status == 200){
          toast.success(
            <div>
              <p className="font-bold">Login Successfull</p>
              <p>Welcome back!</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );

          dispatch(login(response.data.user));
          localStorage.setItem('chatAccessToken', JSON.stringify(response.data.token));
          navigate('/');
        }
        else if(response.status == 201){
          toast('Use other login method', {
            icon: '⚠️',
          });
        }

      }).catch((error) => {
        console.log('Error Logging in User with Google SignIn -- Error:', error);
        if(error.response.status == 400){
          toast.error(
            <div>
              <p className="font-bold">User not Found!</p>
              <p>Please SignUp.</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );
        }
        else if(error.response.status == 500){
          toast.error(
            <div>
              <p className="font-bold">Server Error!</p>
              <p>Please try again after some time.</p>
            </div>,
            {
              duration: 2200,
              position: 'top-center',
            }
          );
        }

        submitRefbtn.current.disabled = false;
        console.error('Error logging in User with Google SignIn -- Error:', error);
        // alert("Error logging in user: " + error.response.data.error);
      });
  }

  return (
    <>
  
    <form id="authForm" onSubmit={authState=='Login' ? loginFormSubmit : registerFormSubmit} className={cn(`flex flex-col ${authState === 'Login' ? 'gap-6' : 'gap-3'}`, className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">{authState == 'Login' ? 'Login to your account' : 'Create your account'}</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your details below to {authState == 'Login' ? 'Login to your account' : 'Create a new account'}
        </p>
      </div>

      {authState == 'Sign up' && (
        <div className="flex items-center justify-center flex-col">
          <img src="./assets/user_img.jpg" className="w-17 h-17 rounded-full object-cover" />
          <Label htmlFor="profile-photo" className="cursor-pointer text-sm hover:underline">Upload Profile Photo</Label>
          <input type="file" id="profile-photo" className="hidden" placeholder="Upload Profile Photo" name="profilePhoto" onChange={handleProfilePhoto}/>
        </div>
      )}

      <div className="grid gap-5">
        {authState == 'Sign up' && (
          <div className="grid gap-3">
            <Label htmlFor="name">Name</Label>
            <Input className="border-0 focus-visible:ring-0 focus-visible:outline-none" id="name" type="text" placeholder="Name" pattern="^[A-Za-z]{1,10}$" title="Alphabets only, upto 10 characters" style={{ border: '1.2px solid #e5e5e5' , borderRadius: '0.6rem'}} name="name" required />
          </div>
        )}
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input className="border-0 focus-visible:ring-0 focus-visible:outline-none focus-visible:border" id="email" type="email" placeholder="m@example.com" style={{ border: '1.2px solid #e5e5e5' , borderRadius: '0.6rem'}} name="email" required />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            {/* { authState == 'Login' &&
              <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
                Forgot your password?
              </a>
            } */}
          </div>

          <div className="flex items-between border shadow-xs" style={{ border: '1.2px solid #e5e5e5', borderRadius: '0.6rem' }}>
            <Input className="border-0 focus-visible:ring-0 focus-visible:outline-none" id="password" type={passVisible ? "text" : "password"} pattern={authType == "^.{0,8}$"} title="Must contain Uppercase, Lowercase and Numbers, upto 8 characters" name="password" required />

            {
              passVisible ? (
                <button type="button" className="open-eye" id="open-eye" onClick={toggleEye}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </button>
              ):(
                <button type="button" className="close-eye" id="close-eye" onClick={toggleEye}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              )
            }
          </div>

        </div>
        <Button type="submit" className="w-full cursor-pointer" ref={submitRefbtn}>
          {authState}
        </Button>

      </div>
      </form>

        <div
          className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Or continue with
          </span>
        </div>
        {/* <Button variant="outline" className="w-full flex items-center justify-center" onClick={googleSignUp}>
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
          </svg>
          Continue with Google
        </Button> */}
        {authState == 'Login' ? 
          <GoogleLogin onSuccess={async(res)=>{
            console.log(res)
            googleSignIn(res.credential);
            }}
            onError={(err)=>console.log(err)}
          />
          :
          <GoogleLogin text="signup_with" onSuccess={async(res)=>{
            console.log(res)
            googleSignUp(res.credential);
            }}
            onError={(err)=>console.log(err)}
          />
        }

      <div className="text-center text-sm">
        {authState == 'Login' ? `Don't have an account? ` : `Already have an account? `}
        <a href="#" className="underline underline-offset-4" onClick={changeAuthState}>
          {authState == 'Login' ? 'Sign up' : 'Login'}
        </a>
      </div>
    
    </>
  );
}


        {/* <GoogleLogin onSuccess={async(res)=>{
          console.log(res)
          console.log(res.access_token);
          const userClientId = await res.clientId;

          }}
          onError={(err)=>console.log(err)}
        /> */}