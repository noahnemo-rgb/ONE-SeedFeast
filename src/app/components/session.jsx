import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

async function postJson(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function useSession() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const response = await fetch('/api/account/session');
      if (!response.ok) return { user: null };
      return response.json();
    },
  });

  const refresh = useCallback(async (path, body) => {
    const data = await postJson(path, body);
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    return data;
  }, [queryClient]);

  const signIn = useCallback((body) => refresh('/api/account/signin', body), [refresh]);
  const signUp = useCallback((body) => refresh('/api/account/signup', body), [refresh]);
  const signOut = useCallback(() => refresh('/api/account/signout', {}), [refresh]);

  return {
    user: query.data?.user ?? null,
    isAuthenticated: Boolean(query.data?.user),
    isReady: query.isFetched,
    signIn,
    signUp,
    signOut,
  };
}
