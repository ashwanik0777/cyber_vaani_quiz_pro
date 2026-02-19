import type { Db } from "mongodb"
import type { LeaderboardEntry, QuizResult, QuizSession, QuizState } from "@/lib/models"

export function createSessionId() {
  return `session-${Date.now()}`
}

export function getDefaultQuizState(totalQuestions: number = 10): QuizState {
  return {
    activeSessionId: null,
    isActive: false,
    currentQuestionIndex: 0,
    currentQuestionId: null,
    questionStartTime: null,
    countdownActive: false,
    countdownValue: 0,
    totalQuestions,
    startedAt: null,
    endedAt: null,
    participants: 0,
    sessionParticipants: 0,
    leaderboard: [],
    globalLeaderboard: [],
  }
}

function mapLeaderboard(results: any[]): LeaderboardEntry[] {
  return results.map((result, index) => ({
    userId: result.userId || "",
    name: result.name || "Unknown",
    rollNo: result.rollNo || "-",
    totalPoints: result.totalPoints || 0,
    score: result.score || 0,
    totalQuestions: result.totalQuestions || 10,
    percentage: result.percentage || 0,
    rank: index + 1,
    lastAnsweredAt: result.updatedAt || result.completedAt || new Date(),
  }))
}

export async function getSessionLeaderboard(db: Db, sessionId?: string | null): Promise<LeaderboardEntry[]> {
  if (!sessionId) {
    return []
  }

  const quizResultsCollection = db.collection<QuizResult>("quizResults")
  const results = await quizResultsCollection
    .find({ sessionId })
    .sort({ totalPoints: -1, score: -1, percentage: -1, completedAt: 1 })
    .limit(20)
    .toArray()

  return mapLeaderboard(results)
}

export async function getGlobalBestLeaderboard(db: Db): Promise<LeaderboardEntry[]> {
  const quizResultsCollection = db.collection<QuizResult>("quizResults")
  const results = await quizResultsCollection.find({}).toArray()

  const bestByUser = new Map<string, QuizResult>()

  for (const result of results) {
    const key = result.userId || result.rollNo || result.email
    if (!key) continue

    const existing = bestByUser.get(key)
    if (!existing) {
      bestByUser.set(key, result)
      continue
    }

    const isBetter =
      (result.totalPoints || 0) > (existing.totalPoints || 0) ||
      ((result.totalPoints || 0) === (existing.totalPoints || 0) && (result.score || 0) > (existing.score || 0)) ||
      ((result.totalPoints || 0) === (existing.totalPoints || 0) &&
        (result.score || 0) === (existing.score || 0) &&
        (result.percentage || 0) > (existing.percentage || 0))

    if (isBetter) {
      bestByUser.set(key, result)
    }
  }

  const bestResults = Array.from(bestByUser.values())
    .sort(
      (a, b) =>
        (b.totalPoints || 0) - (a.totalPoints || 0) ||
        (b.score || 0) - (a.score || 0) ||
        (b.percentage || 0) - (a.percentage || 0),
    )
    .slice(0, 20)

  return mapLeaderboard(bestResults)
}

export async function getSessionParticipantsCount(db: Db, sessionId?: string | null): Promise<number> {
  if (!sessionId) {
    return 0
  }

  const quizResultsCollection = db.collection<QuizResult>("quizResults")
  const uniqueParticipants = await quizResultsCollection.distinct("userId", { sessionId })
  return uniqueParticipants.filter(Boolean).length
}

export async function upsertSessionMeta(
  db: Db,
  sessionId: string,
  totalQuestions: number,
  startedAt: Date,
): Promise<void> {
  const quizSessionsCollection = db.collection<QuizSession>("quizSessions")

  await quizSessionsCollection.updateOne(
    { sessionId },
    {
      $setOnInsert: {
        sessionId,
        startedAt,
        endedAt: null,
        participants: 0,
        createdAt: new Date(),
      },
      $set: {
        totalQuestions,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  )
}

export async function closeSessionMeta(db: Db, sessionId?: string | null): Promise<void> {
  if (!sessionId) return

  const quizSessionsCollection = db.collection<QuizSession>("quizSessions")
  const participants = await getSessionParticipantsCount(db, sessionId)

  await quizSessionsCollection.updateOne(
    { sessionId },
    {
      $set: {
        endedAt: new Date(),
        participants,
        updatedAt: new Date(),
      },
    },
  )
}
