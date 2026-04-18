const BASE = import.meta.env.VITE_API_URL ?? '/api'

function getToken() {
  return localStorage.getItem('token')
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: headers() })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur réseau')
  return data as T
}

export const api = {
  register: (username: string, email: string, password: string) =>
    request<{ token: string; username: string; id: number }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ username, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; username: string; id: number }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),

  getQuizzes: (groupCode?: string) =>
    request<import('../types.js').QuizMeta[]>(`/quizzes${groupCode ? `?group=${groupCode}` : ''}`),

  getQuiz: (id: number) =>
    request<import('../types.js').QuizData & { id: number }>(`/quizzes/${id}`),

  uploadQuiz: (data: { title: string; description?: string; questions: unknown[]; isPublic?: boolean; groupCode?: string }) =>
    request<{ id: number }>('/quizzes', { method: 'POST', body: JSON.stringify(data) }),

  deleteQuiz: (id: number) =>
    request<{ ok: boolean }>(`/quizzes/${id}`, { method: 'DELETE' }),

  submitScore: (quizId: number, score: number, correct: number, total: number) =>
    request<{ ok: boolean }>('/scores', {
      method: 'POST', body: JSON.stringify({ quizId, score, correct, total }),
    }),

  getLeaderboard: (quizId: number) =>
    request<import('../types.js').ScoreEntry[]>(`/scores/quiz/${quizId}`),

  getGroupLeaderboard: (groupCode: string, quizId: number) =>
    request<import('../types.js').ScoreEntry[]>(`/scores/group/${groupCode}/quiz/${quizId}`),

  getGroups: () =>
    request<import('../types.js').Group[]>('/groups'),

  createGroup: (name: string) =>
    request<{ id: number; code: string }>('/groups', { method: 'POST', body: JSON.stringify({ name }) }),

  getGroup: (code: string) =>
    request<import('../types.js').GroupDetail>(`/groups/${code}`),

  joinGroup: (code: string) =>
    request<{ ok: boolean }>(`/groups/${code}/join`, { method: 'POST' }),

  leaveGroup: (code: string) =>
    request<{ ok: boolean }>(`/groups/${code}/leave`, { method: 'DELETE' }),
}
