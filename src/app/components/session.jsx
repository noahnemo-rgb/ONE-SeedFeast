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

  async function refresh(path, body) {
    const data = await postJson(path, body);
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    return data;
  }

  return {
    user: query.data?.user ?? null,
    isAuthenticated: Boolean(query.data?.user),
    isReady: query.isFetched,
    signIn: (body) => refresh('/api/account/signin', body),
    signUp: (body) => refresh('/api/account/signup', body),
    signOut: () => refresh('/api/account/signout', {}),
  };
}
