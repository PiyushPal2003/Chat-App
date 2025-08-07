import React from 'react'
import {Outlet} from 'react-router-dom';
import {jwtDecode} from "jwt-decode";
import { Navigate } from 'react-router-dom';

function ProtectedRoute() {
  const [valid, setValid] = React.useState(false);
  const token = localStorage.getItem("chatAccessToken");
  if(token){
    try {
      const decoded = jwt_decode(token);
      let valid = decoded.exp * 1000 > Date.now();
      setValid(valid);
      console.log("access token");
    } catch (e) {
      setValid(false);
    }
  }
  else{
    console.log("no access token");
  }

  return valid ? <Outlet /> : <Navigate to="/auth" />;
}

export default ProtectedRoute
