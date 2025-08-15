import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: `http://localhost:5000/api` }),
  tagTypes: ["Users"],

  endpoints: (builder) => ({

    getUser: builder.query({
      query: () => ({
        url: "/users",
        credentials: "include",
      }),
      providesTags: ["Users"],
    }),

  }),
})

export default api;
export const { useGetUserQuery } = api;