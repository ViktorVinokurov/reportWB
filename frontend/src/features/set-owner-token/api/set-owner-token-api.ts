import type { Owner } from "@/entities/owner";
import { baseApi } from "@/shared/api";

export const setOwnerTokenApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    setOwnerToken: build.mutation<Owner, { ownerId: string; token: string }>({
      query: ({ ownerId, token }) => ({
        url: `owners/${ownerId}/token`,
        method: "PATCH",
        body: { token },
      }),
      invalidatesTags: ["Owners"],
    }),
  }),
});

export const { useSetOwnerTokenMutation } = setOwnerTokenApi;
