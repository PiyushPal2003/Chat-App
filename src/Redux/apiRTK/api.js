import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { login, logout } from "../Reducers/authSlice";

const baseQuery = fetchBaseQuery({ baseUrl: `http://localhost:5000/api`, credentials: "include" });

const fetchBaseQueryWithReAuth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 401 && result?.error?.data?.message === "Invalid or expired token") 
  {
    console.log("access token expired, trying refresh token");
    const refreshResult = await baseQuery({ url: "/auth/refresh" }, api, extraOptions);;
    if (refreshResult.data) {
      result = await baseQuery(args, api, extraOptions);
    } else {
      console.log("refresh failed", refreshResult.error);
      api.dispatch(logout());
    }
  }

  return result;
}

const api = createApi({
  reducerPath: "api",
  // baseQuery: fetchBaseQuery({ baseUrl: `http://localhost:5000/api`, credentials: "include" }),
  baseQuery: fetchBaseQueryWithReAuth,
  tagTypes: ["currentUser", "currentChat", "Users", "Chats", "UserMessages"],

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

    getCurrentUser: builder.query({
      query: () => ({
        url: "/currentuser",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        credentials: "include",
      }),
      providesTags: ["currentUser"],
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

    editProfile: builder.mutation({
      query: (data) => ({
        url: "/editprofile",
        method: "PATCH",
        headers: {
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["currentUser"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log("Profile edited successfully:", data);
          dispatch(login(data.usr));
        } catch (err) {
          console.error(err);
        }
      },
    }),
    
    editGroup: builder.mutation({
      query: (data) => ({
        url: "/editgroup",
        method: "PATCH",
        headers: {
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["currentChat", "UserMessages"],
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

    createGroupChat: builder.mutation({
      query: (payload) => ({
        url: `/creategroup`,
        method: "POST",
        headers: {
          // "Content-Type": "application/json",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        body: payload,
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
      providesTags: ["currentChat"],
    }),

    fetchMessages: builder.query({
      query: ({id, lastMessageId}) => ({
        url: `/fetchmessages?chatId=${id}&lastMessageId=${lastMessageId || ""}`,
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        credentials: "include",
      }),
      providesTags: ["UserMessages"],
    }),

    sendChat: builder.mutation({
      query: ({data, id}) => ({
        url: `/sendchat/${id}`,
        method: "POST",
        headers: {
          // "Content-Type": "multipart/form-data",
          authorization: `Bearer ${JSON.parse(localStorage.getItem("chatAccessToken"))}`,
        },
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["UserMessages", "Chats"],
    }),
  
  }),
})

export default api;
export const { useGetUserQuery, useEditProfileMutation, useGetChatsQuery, useSendChatMutation, useCreateChatMutation, useFetchChatQuery, useRefreshTokenMutation, useLazyFetchMessagesQuery, useCreateGroupChatMutation, useLazyGetCurrentUserQuery, useEditGroupMutation} = api;