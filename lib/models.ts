export interface User {
  _id?: string
  name: string
  rollNo: string
  mobileNo: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface QuizResult {
  _id?: string
  sessionId?: string
  userId: string
  name: string
  rollNo: string
  mobileNo: string
  email: string
  score: number
  totalQuestions: number
  percentage: number
  answers: Array<{
    questionId: number
    selectedOption: string
    isCorrect: boolean
    timeTaken: number
    pointsEarned: number
    answeredAt: Date
  }>
  completedAt: Date
  isEligibleForReward: boolean
  rewardGiven: boolean
  currentRank?: number
  totalPoints: number
  updatedAt?: Date
}

export interface AdminUser {
  username: string
  password: string
}

// Real-time Quiz State
export interface QuizState {
  _id?: string
  activeSessionId?: string | null
  isActive: boolean
  currentQuestionIndex: number
  currentQuestionId: number | null
  questionStartTime: Date | null
  countdownActive: boolean
  countdownValue: number
  totalQuestions: number
  startedAt: Date | null
  endedAt: Date | null
  participants: number
  sessionParticipants?: number
  leaderboard: LeaderboardEntry[]
  globalLeaderboard?: LeaderboardEntry[]
}

export interface QuizSession {
  _id?: string
  sessionId: string
  startedAt: Date
  endedAt: Date | null
  totalQuestions: number
  participants: number
  createdAt: Date
  updatedAt: Date
}

export interface LeaderboardEntry {
  userId: string
  name: string
  rollNo: string
  totalPoints: number
  score: number
  totalQuestions: number
  percentage: number
  rank: number
  lastAnsweredAt: Date
}

export interface LiveAnswer {
  userId: string
  questionId: number
  selectedOption: number
  isCorrect: boolean
  timeTaken: number
  pointsEarned: number
  answeredAt: Date
}
