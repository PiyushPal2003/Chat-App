import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useSelector, useDispatch } from 'react-redux';
import { login, logout } from "../../Redux/Reducers/authSlice";
import {useLazyGetCurrentUserQuery} from '../../Redux/apiRTK/api';

function ProtectedRoute() {
  const [valid, setValid] = useState(null);
  const location = useLocation();
  const user = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const token = localStorage.getItem("chatAccessToken");

  // const { data: currentUser, isSuccess, isError } = useGetCurrentUserQuery(undefined, {
  //   skip: !token,
  // });

  const [triggerGetUser, { data: userData, error, isLoading }] = useLazyGetCurrentUserQuery();

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const isValid = decoded.exp * 1000 > Date.now();

        if (!isValid) {
          console.log("invalid token trying refresh");

          axios
            .get("http://localhost:5000/api/auth/refresh", {
              withCredentials: true,
            })
            .then((response) => {
              console.log("Token refreshed:", response.data);
              setValid(true);
              localStorage.setItem(
                "chatAccessToken",
                JSON.stringify(response.data.accessToken)
              );
              dispatch(login(response.data.user));
              return;
            })
            .catch((error) => {
              console.log("refresh failed redirecting to auth page", error);
              dispatch(logout());
              setValid(false);
              return;
            });
        } else {
          console.log("valid access token");
          setValid(isValid);

          triggerGetUser().unwrap().then((res) => {
            console.log("Fetched current user:", res.user);
            dispatch(login(res.user));
          })
          .catch((err) => {
            console.log("Error fetching current user:", err);
            dispatch(logout());
            setValid(false);
          });

        }
      } catch (e) {
        console.log("Unknown error or token invalid", e);
        dispatch(logout());
        setValid(false);
      }
    } else {
      console.log("no token redirecting to auth page");
      dispatch(logout());
      setValid(false);
    }
  }, [location]); // Re-run check on every route change

  if (valid === null) return null; // or a loading spinner

  return valid ? <Outlet /> : <Navigate to="/auth" />;
}

export default ProtectedRoute;
