import type { Owner } from "@/entities/owner";
import { baseApi } from "@/shared/api";

export const createOwnerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createOwner: build.mutation<Owner, { owner: string }>({
      query: (body) => ({ url: "owners", method: "POST", body }),
      invalidatesTags: ["Owners"],
    }),
  }),
});

export const { useCreateOwnerMutation } = createOwnerApi;
