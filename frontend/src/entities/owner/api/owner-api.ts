import { baseApi } from "@/shared/api";

import type { Owner } from "../model/types";

export const ownerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOwners: build.query<Owner[], void>({
      query: () => "owners",
      providesTags: ["Owners"],
    }),
  }),
});

export const { useGetOwnersQuery } = ownerApi;
