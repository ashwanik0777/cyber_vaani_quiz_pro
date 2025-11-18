import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizResult } from "@/lib/models"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, rollNo, mobileNo, email, score, totalQuestions, answers } = body

    // Validate required fields
    if (!name || !rollNo || !mobileNo || !email || score === undefined || !totalQuestions || !answers) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const db = await getDatabase()
    const quizResultsCollection = db.collection<QuizResult>("quizResults")

    // Check if user has already completed quiz
    const existingResult = await quizResultsCollection.findOne({
      $or: [{ rollNo: rollNo }, { mobileNo: mobileNo }, { email: email }],
    })

    if (existingResult) {
      return NextResponse.json({ error: "Quiz already completed by this user" }, { status: 409 })
    }

    const percentage = Math.round((score / totalQuestions) * 100)
    const isEligibleForReward = percentage >= 80

    // Create quiz result
    const quizResult: QuizResult = {
      userId: userId || "",
      name,
      rollNo,
      mobileNo,
      email,
      score,
      totalQuestions,
      percentage,
      answers,
      completedAt: new Date(),
      isEligibleForReward,
      rewardGiven: false,
    }

    const result = await quizResultsCollection.insertOne(quizResult)

    return NextResponse.json({
      success: true,
      resultId: result.insertedId,
      result: { ...quizResult, _id: result.insertedId },
    })
  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
