import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/lib/keys';
import { usePaged } from '@/lib/paged';
import type { Conversation, ConversationSummary } from '@/shared/types';

export const useConversations = (box: 'mine' | 'team', enabled = true) =>
  usePaged<ConversationSummary>(keys.messages(box), `/messages?box=${box}`, { enabled });

export const useConversation = (id: string | null) =>
  useQuery({
    queryKey: keys.conversation(id ?? ''),
    queryFn: () => api.get<Conversation>(`/messages/${id}`),
    enabled: Boolean(id),
  });

/** Refreshes lists, the open conversation and the unread badge in /me. */
export function useInvalidateMessages() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['messages'] });
    void qc.invalidateQueries({ queryKey: keys.me });
  };
}

export function useSendMessage() {
  const invalidate = useInvalidateMessages();
  return useMutation({
    mutationFn: (input: { subject: string; body: string; to?: string; asTeam?: boolean }) =>
      api.post<{ id: string; messageId: string }>('/messages', input),
    onSuccess: invalidate,
  });
}

export function useReply(id: string) {
  const invalidate = useInvalidateMessages();
  return useMutation({
    mutationFn: (input: { body: string; asTeam?: boolean }) =>
      api.post<{ id: string; messageId: string }>(`/messages/${id}/reply`, input),
    onSuccess: invalidate,
  });
}
