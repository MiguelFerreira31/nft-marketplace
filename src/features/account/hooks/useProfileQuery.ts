import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { ChangePasswordRequest, UpdateAvatarRequest, UpdateProfileRequest, UserId } from '@/shared/types'
import { profileApi } from '../api/profile.api'

export function useProfileQuery(userId: UserId | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.detail(userId as UserId),
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled: Boolean(userId),
  })
}

export function useUpdateProfileMutation(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => profileApi.update(payload),
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile.detail(userId), profile),
  })
}

export function useUpdateAvatarMutation(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateAvatarRequest) => profileApi.updateAvatar(payload),
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile.detail(userId), profile),
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => profileApi.changePassword(payload),
  })
}
