export interface Question {
  question: string
  answers: string[]
  correct: number
  timeLimit?: number
}

export interface QuizData {
  title: string
  questions: Question[]
}

export interface QuizMeta {
  id: number
  title: string
  description: string
  isPublic: boolean
  ownerName: string | null
  isOwner: boolean
  questionCount: number
  createdAt: number
  groupCode: string | null
  groupName: string | null
}

export interface ScoreEntry {
  username: string
  score: number
  correct: number
  total: number
  played_at: number
  rank: number
}

export interface Group {
  id: number
  name: string
  code: string
  ownerName: string
  isOwner: boolean
  memberCount: number
  createdAt: number
}

export interface GroupDetail extends Group {
  isMember: boolean
  members: { username: string; joined_at: number }[]
}

export type GamePhase = 'lobby' | 'question' | 'answer' | 'end'
