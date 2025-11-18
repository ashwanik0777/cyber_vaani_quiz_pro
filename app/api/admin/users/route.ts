import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizResult } from "@/lib/models"

export async function GET(request: NextRequest) {
  try {
    // Simple admin authentication check
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()
    const quizResultsCollection = db.collection<QuizResult>("quizResults")

    // Get all quiz results with user data
    const results = await quizResultsCollection.find({}).sort({ completedAt: -1 }).toArray()

    // Calculate statistics
    const totalUsers = results.length
    const eligibleForRewards = results.filter((r) => r.isEligibleForReward).length
    const averageScore =
      results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length) : 0

    return NextResponse.json({
      success: true,
      data: {
        users: results,
        statistics: {
          totalUsers,
          eligibleForRewards,
          averageScore,
          rewardsGiven: results.filter((r) => r.rewardGiven).length,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching admin data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
