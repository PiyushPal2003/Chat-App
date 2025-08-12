import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useSelector, useDispatch } from 'react-redux';
import { login, logout } from "../../Redux/Reducers/authSlice";

function ProtectedRoute() {
  const [valid, setValid] = useState(null);
  const location = useLocation();
  const user = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("chatAccessToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const isValid = decoded.exp * 1000 > Date.now();
        setValid(isValid);
        dispatch(login(decoded));
      } catch (e) {
        dispatch(logout());
        setValid(false);
      }
    } else {

      axios.get('/api/auth/refresh', { withCredentials: true })
      .then((response) => {
        console.log('Token refreshed:', response.data);
      })
      .catch((error) => {
        console.log("redirecting to auth page");
        dispatch(logout());
        setValid(false);
      });
      // console.log("redirecting to auth page");
      // dispatch(logout());
      // setValid(false);
    }
  }, [location]); // Re-run check on every route change

  if (valid === null) return null; // or a loading spinner

  return valid ? <Outlet /> : <Navigate to="/auth" />;
}

export default ProtectedRoute;
