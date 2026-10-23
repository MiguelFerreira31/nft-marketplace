import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { ChangePasswordRequest, Profile, Session, UpdateAvatarRequest, UpdateProfileRequest, UserId } from '@/shared/types'
import { profileApi } from '../api/profile.api'

function cacheProfile(queryClient: ReturnType<typeof useQueryClient>, profile: Profile) {
  const session = queryClient.getQueryData<Session | null>(queryKeys.session())
  if (!session || session.user.id !== profile.id) return

  queryClient.setQueryData(queryKeys.profile.detail(profile.id), profile)
  queryClient.setQueryData<Session | null>(queryKeys.session(), (current) =>
    current && current.user.id === profile.id
      ? {
          ...current,
          user: {
            ...current.user,
            name: profile.name,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
          },
        }
      : current,
  )
}

export function useProfileQuery(userId: UserId | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.detail(userId as UserId),
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled: Boolean(userId),
  })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => profileApi.update(payload),
    onSuccess: (profile) => cacheProfile(queryClient, profile),
  })
}

export function useUpdateAvatarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateAvatarRequest) => profileApi.updateAvatar(payload),
    onSuccess: (profile) => cacheProfile(queryClient, profile),
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => profileApi.changePassword(payload),
  })
}
