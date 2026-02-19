import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizState, LiveAnswer, LeaderboardEntry } from "@/lib/models"
import { getGlobalBestLeaderboard, getSessionLeaderboard } from "@/lib/quiz-session"

export const dynamic = 'force-dynamic'

// Submit answer in real-time
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, rollNo, questionId, selectedOption, timeTaken } = body

    if (!userId || !questionId || selectedOption === undefined || timeTaken === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDatabase()
    const quizStateCollection = db.collection<QuizState>("quizState")
    const quizResultsCollection = db.collection("quizResults")
    const quizDataCollection = db.collection("quizData")

    const currentState = await quizStateCollection.findOne({})
    const activeSessionId = currentState?.activeSessionId

    if (!activeSessionId) {
      return NextResponse.json({ error: "No active quiz session" }, { status: 400 })
    }

    // Get current question to check correct answer
    const { quizQuestions } = await import("@/lib/quiz-data")
    const question = quizQuestions.find((q) => q.id === questionId)
    
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    const isCorrect = selectedOption === question.correctAnswer
    // Calculate points based on time (faster = more points)
    // Max points: 100, decreases with time
    let pointsEarned = 0
    if (isCorrect) {
      const timeElapsed = timeTaken
      // First correct answer gets bonus
      const existingAnswers = await quizDataCollection.find({
        sessionId: activeSessionId,
        questionId,
        isCorrect: true,
      }).sort({ answeredAt: 1 }).toArray()
      
      const isFirstCorrect = existingAnswers.length === 0
      const basePoints = Math.max(0, 100 - (timeElapsed * 5)) // Decrease 5 points per second
      const firstAnswerBonus = isFirstCorrect ? 50 : 0
      pointsEarned = Math.round(basePoints + firstAnswerBonus)
    }

    // Store answer
    const answer: LiveAnswer = {
      userId,
      questionId,
      selectedOption,
      isCorrect,
      timeTaken,
      pointsEarned,
      answeredAt: new Date(),
    }

    await quizDataCollection.insertOne({
      ...answer,
      sessionId: activeSessionId,
    })

    // Update or create user result
    const existingResult = await quizResultsCollection.findOne({ userId, sessionId: activeSessionId })
    
    if (existingResult) {
      // Update existing result
      const currentAnswers = existingResult.answers || []
      const answerIndex = currentAnswers.findIndex((a: any) => a.questionId === questionId)
      
      const answerData = {
        questionId,
        selectedOption: question.options[selectedOption],
        isCorrect,
        timeTaken,
        pointsEarned,
        answeredAt: new Date(),
      }

      let updatedAnswers
      if (answerIndex >= 0) {
        updatedAnswers = [...currentAnswers]
        updatedAnswers[answerIndex] = answerData
      } else {
        updatedAnswers = [...currentAnswers, answerData]
      }

      const newScore = updatedAnswers.filter((a: any) => a.isCorrect).length
      const newTotalPoints = updatedAnswers.reduce((sum: number, a: any) => sum + (a.pointsEarned || 0), 0)
      const newPercentage = Math.round((newScore / existingResult.totalQuestions) * 100)

      await quizResultsCollection.updateOne(
        { userId, sessionId: activeSessionId },
        {
          $set: {
            answers: updatedAnswers,
            score: newScore,
            totalPoints: newTotalPoints,
            percentage: newPercentage,
            updatedAt: new Date(),
          },
        }
      )
    } else {
      // Create new result
      await quizResultsCollection.insertOne({
        sessionId: activeSessionId,
        userId,
        name,
        rollNo,
        mobileNo: "",
        email: "",
        score: isCorrect ? 1 : 0,
        totalQuestions: currentState?.totalQuestions || 10,
        percentage: Math.round((isCorrect ? 1 : 0) / (currentState?.totalQuestions || 10) * 100),
        answers: [{
          questionId,
          selectedOption: question.options[selectedOption],
          isCorrect,
          timeTaken,
          pointsEarned,
          answeredAt: new Date(),
        }],
        completedAt: new Date(),
        isEligibleForReward: false,
        rewardGiven: false,
        totalPoints: pointsEarned,
        currentRank: 0,
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({
      success: true,
      isCorrect,
      pointsEarned,
    })
  } catch (error) {
    console.error("Error submitting live answer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Get leaderboard
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const quizStateCollection = db.collection<QuizState>("quizState")
    const state = await quizStateCollection.findOne({})

    const leaderboard: LeaderboardEntry[] = await getSessionLeaderboard(db, state?.activeSessionId)
    const globalLeaderboard = await getGlobalBestLeaderboard(db)

    return NextResponse.json({
      success: true,
      leaderboard,
      globalLeaderboard,
      activeSessionId: state?.activeSessionId || null,
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

