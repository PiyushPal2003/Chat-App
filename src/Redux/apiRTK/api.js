import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
// import { login, logout } from "../Reducers/authSlice";

const baseQuery = fetchBaseQuery({ baseUrl: `http://localhost:5000/api`, credentials: "include" });

const fetchBaseQueryWithReAuth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 401 && result?.error?.data?.message === "Invalid or expired token") 
  {
    const refreshResult = await baseQuery("/auth/refresh", api, extraOptions);
    if (refreshResult.data) {
      result = await baseQuery(args, api, extraOptions);
    } else {
      console.log("refresh failed");
      // api.dispatch(logout());
    }
  }
}

const api = createApi({
  reducerPath: "api",
  // baseQuery: fetchBaseQuery({ baseUrl: `http://localhost:5000/api`, credentials: "include" }),
  baseQuery: fetchBaseQueryWithReAuth,
  tagTypes: ["Users", "Chats"],

  endpoints: (builder) => ({

    refreshToken: builder.mutation({
      query: () => ({
        url: "/auth/refresh",
        method: "GET",
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log("Token refreshed:", data);
          localStorage.setItem(
            "chatAccessToken",
            JSON.stringify(data.accessToken)
          );
          dispatch(login(data.user));

        } catch (error) {
          console.log("refresh failed redirecting to auth page", error);
          dispatch(logout());
        }
      },
    }),

    getUser: builder.query({
      query: () => ({
        url: "/users",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        credentials: "include",
      }),
      providesTags: ["Users"],
    }),

    createChat: builder.mutation({
      query: (id) => ({
        url: `/createchats`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        body: {id},
        credentials: "include",
      }),
      invalidatesTags: ["Chats"],
    }),

    getChats: builder.query({
      query: (id) => ({
        url: `/chats/${id}`,
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        credentials: "include",
      }),
      providesTags: ["Chats"],
    }),

    fetchChat: builder.query({
      query: (id) => ({
        url: `/fetchchat/${id}`,
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        credentials: "include",
      }),
    }),

    sendChat: builder.mutation({
      query: ({data, id}) => ({
        url: `/chats/${id}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Chats"],
    }),
  
  }),
})

export default api;
export const { useGetUserQuery, useGetChatsQuery, useSendChatMutation, useCreateChatMutation, useFetchChatQuery, useRefreshTokenMutation} = api;