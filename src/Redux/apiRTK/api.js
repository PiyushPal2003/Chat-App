import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: `http://localhost:5000/api` }),
  tagTypes: ["Users", "Chats"],

  endpoints: (builder) => ({

    getUser: builder.query({
      query: () => ({
        url: "/users",
        credentials: "include",
      }),
      providesTags: ["Users"],
    }),



    getChats: builder.query({
      query: (id) => ({
        url: `/chats/${id}`,
        credentials: "include",
      }),
      providesTags: ["Chats"],
    }),

    sendChat: builder.mutation({
      query: ({data, id}) => ({
        url: `/chats/${id}`,
        method: "POST",
        credentials: "include",
        body: data,
      }),
      invalidatesTags: ["Chats"],
    }),
  
  }),
})

export default api;
export const { useGetUserQuery, useGetChatsQuery, useSendChatMutation } = api;