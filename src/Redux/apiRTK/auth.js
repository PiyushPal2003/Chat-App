import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: `http:localhost:5000/api` }),
//   tagTypes: ["Chat", "User", "Message"],

  endpoints: (builder) => ({

    register: builder.mutation({
      query: () => ({
        url: "/auth/register",
        method: 'POST',
        credentials: "include",
        body: {},
      }),
    //   providesTags: ["Chat"],
    }),

  }),
})

export default api;
export const { useRegisterQuery } = api;