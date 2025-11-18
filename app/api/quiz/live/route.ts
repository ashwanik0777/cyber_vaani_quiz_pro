import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizState, LiveAnswer, LeaderboardEntry } from "@/lib/models"
import { ObjectId } from "mongodb"

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

    // Get current question to check correct answer
    const { quizQuestions } = await import("@/lib/quiz-data")
    const question = quizQuestions.find((q) => q.id === questionId)
    
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    const isCorrect = selectedOption === question.correctAnswer
    const questionStartTime = (await quizStateCollection.findOne({}))?.questionStartTime
    
    // Calculate points based on time (faster = more points)
    // Max points: 100, decreases with time
    let pointsEarned = 0
    if (isCorrect) {
      const maxTime = 15 // seconds
      const timeElapsed = timeTaken
      // First correct answer gets bonus
      const existingAnswers = await quizDataCollection.find({
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

    await quizDataCollection.insertOne(answer)

    // Update or create user result
    const existingResult = await quizResultsCollection.findOne({ userId })
    
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
        { userId },
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
        userId,
        name,
        rollNo,
        mobileNo: "",
        email: "",
        score: isCorrect ? 1 : 0,
        totalQuestions: 10,
        percentage: isCorrect ? 10 : 0,
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
    const quizResultsCollection = db.collection("quizResults")

    // Get all active participants sorted by total points
    const results = await quizResultsCollection
      .find({})
      .sort({ totalPoints: -1, score: -1 })
      .limit(20)
      .toArray()

    const leaderboard: LeaderboardEntry[] = results.map((result, index) => ({
      userId: result.userId,
      name: result.name,
      rollNo: result.rollNo,
      totalPoints: result.totalPoints || 0,
      score: result.score || 0,
      totalQuestions: result.totalQuestions || 10,
      percentage: result.percentage || 0,
      rank: index + 1,
      lastAnsweredAt: result.updatedAt || result.completedAt || new Date(),
    }))

    return NextResponse.json({
      success: true,
      leaderboard,
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

