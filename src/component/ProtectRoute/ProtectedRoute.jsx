import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login, logout } from "../../Redux/Reducers/authSlice";
import {useLazyGetCurrentUserQuery} from '../../Redux/apiRTK/api';

function ProtectedRoute() {
  const [valid, setValid] = useState(null);
  const location = useLocation();
  const dispatch = useDispatch();
  const token = localStorage.getItem("chatAccessToken");

  // const { data: currentUser, isSuccess, isError } = useGetCurrentUserQuery(undefined, {
  //   skip: !token,
  // });

  const [triggerGetUser] = useLazyGetCurrentUserQuery();

  useEffect(() => {
    if (token) {
      triggerGetUser().unwrap().then((res) => {
        console.log("Fetched current user:", res.user);
        dispatch(login(res.user));
        setValid(true);
      })
      .catch((err) => {
        console.log("Error fetching current user:", err);
        dispatch(logout());
        setValid(false);
      });
    } else {
      console.log("no token redirecting to auth page");
      dispatch(logout());
      setValid(false);
    }
  }, [location, token, triggerGetUser, dispatch]); // Re-run check on every route change

  if (valid === null) return null; // or a loading spinner

  return valid ? <Outlet /> : <Navigate to="/auth" />;
}

export default ProtectedRoute;
