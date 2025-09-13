import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: `http://localhost:5000/api` }),
  tagTypes: ["Users", "Chats"],

  endpoints: (builder) => ({

    // refreshToken: builder.mutation({

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
export const { useGetUserQuery, useGetChatsQuery, useSendChatMutation, useCreateChatMutation, useFetchChatQuery} = api;