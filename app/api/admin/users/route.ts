import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizResult, QuizSession, QuizState } from "@/lib/models"
import { getGlobalBestLeaderboard, getSessionLeaderboard, getSessionParticipantsCount } from "@/lib/quiz-session"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Simple admin authentication check
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()
    const quizResultsCollection = db.collection<QuizResult>("quizResults")
    const quizStateCollection = db.collection<QuizState>("quizState")
    const quizSessionsCollection = db.collection<QuizSession>("quizSessions")
    const state = await quizStateCollection.findOne({})
    const activeSessionId = state?.activeSessionId || null

    // Get all quiz results with user data
    const results = await quizResultsCollection.find({}).sort({ completedAt: -1 }).toArray()
    const globalBestLeaderboard = await getGlobalBestLeaderboard(db)
    const sessionLeaderboard = await getSessionLeaderboard(db, activeSessionId)
    const sessionParticipants = await getSessionParticipantsCount(db, activeSessionId)
    const recentSessions = await quizSessionsCollection
      .find({})
      .sort({ startedAt: -1 })
      .limit(20)
      .toArray()

    const globalBestRows = globalBestLeaderboard.map((entry) => {
      const matched = results.find(
        (r) => (r.userId && r.userId === entry.userId) || (!r.userId && r.rollNo === entry.rollNo),
      )

      return {
        _id: matched?._id,
        userId: entry.userId,
        name: entry.name,
        rollNo: entry.rollNo,
        mobileNo: matched?.mobileNo || "",
        email: matched?.email || "",
        score: entry.score,
        totalQuestions: entry.totalQuestions,
        percentage: entry.percentage,
        totalPoints: entry.totalPoints,
        isEligibleForReward: (entry.percentage || 0) >= 80,
        rewardGiven: matched?.rewardGiven || false,
      }
    })

    // Calculate statistics
    const totalUsers = globalBestRows.length
    const eligibleForRewards = globalBestRows.filter((r) => r.isEligibleForReward).length
    const averageScore =
      globalBestRows.length > 0
        ? Math.round(globalBestRows.reduce((sum, r) => sum + r.percentage, 0) / globalBestRows.length)
        : 0

    return NextResponse.json({
      success: true,
      data: {
        users: globalBestRows,
        allAttempts: results,
        activeSessionId,
        sessionLeaderboard,
        globalBestLeaderboard,
        recentSessions,
        statistics: {
          totalUsers,
          eligibleForRewards,
          averageScore,
          rewardsGiven: globalBestRows.filter((r) => r.rewardGiven).length,
          totalAttempts: results.length,
          sessionParticipants,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching admin data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
