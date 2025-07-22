import React from 'react'
import {Outlet} from 'react-router-dom';

function ProtectedRoute({children}) {
    // if(localStorage.getItem("token") === null) {
    //     console.log("No token found, redirecting to login page");
    // }
  return (
    <> 
    {localStorage.getItem("token") ? (
        <Outlet/>
      ) : (
        <div>
          <h1>Please log in to access this page.</h1>
        </div>
      )
    }
    </>
  )
}

export default ProtectedRoute
