import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizState } from "@/lib/models"
import { ObjectId } from "mongodb"

// Get current quiz state
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const quizStateCollection = db.collection<QuizState>("quizState")

    let state = await quizStateCollection.findOne({})
    
    // If no state exists, create default state
    if (!state) {
      const defaultState: QuizState = {
        isActive: false,
        currentQuestionIndex: 0,
        currentQuestionId: null,
        questionStartTime: null,
        countdownActive: false,
        countdownValue: 0,
        totalQuestions: 10,
        startedAt: null,
        endedAt: null,
        participants: 0,
        leaderboard: [],
      }
      const result = await quizStateCollection.insertOne(defaultState)
      state = { ...defaultState, _id: result.insertedId }
    }

    return NextResponse.json({ success: true, state })
  } catch (error) {
    console.error("Error fetching quiz state:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Update quiz state (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Simple admin authentication check
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, questionId, totalQuestions } = body

    const db = await getDatabase()
    const quizStateCollection = db.collection<QuizState>("quizState")

    let state = await quizStateCollection.findOne({})
    
    if (!state) {
      const defaultState: QuizState = {
        isActive: false,
        currentQuestionIndex: 0,
        currentQuestionId: null,
        questionStartTime: null,
        countdownActive: false,
        countdownValue: 0,
        totalQuestions: totalQuestions || 10,
        startedAt: null,
        endedAt: null,
        participants: 0,
        leaderboard: [],
      }
      const result = await quizStateCollection.insertOne(defaultState)
      state = { ...defaultState, _id: result.insertedId }
    }

    let updateData: Partial<QuizState> = {}

    switch (action) {
      case "start_countdown":
        updateData = {
          countdownActive: true,
          countdownValue: 5,
          isActive: false,
        }
        // Auto-decrease countdown from 5 to 1
        setTimeout(async () => {
          await quizStateCollection.updateOne(
            { _id: state._id },
            { $set: { countdownValue: 4 } }
          )
        }, 1000)
        setTimeout(async () => {
          await quizStateCollection.updateOne(
            { _id: state._id },
            { $set: { countdownValue: 3 } }
          )
        }, 2000)
        setTimeout(async () => {
          await quizStateCollection.updateOne(
            { _id: state._id },
            { $set: { countdownValue: 2 } }
          )
        }, 3000)
        setTimeout(async () => {
          await quizStateCollection.updateOne(
            { _id: state._id },
            { $set: { countdownValue: 1 } }
          )
        }, 4000)
        setTimeout(async () => {
          await quizStateCollection.updateOne(
            { _id: state._id },
            { $set: { countdownValue: 0, countdownActive: false } }
          )
        }, 5000)
        break
      
      case "start_question":
        updateData = {
          isActive: true,
          currentQuestionId: questionId,
          currentQuestionIndex: state.currentQuestionIndex,
          questionStartTime: new Date(),
          countdownActive: false,
          countdownValue: 0,
          startedAt: state.startedAt || new Date(),
        }
        break
      
      case "next_question":
        const nextIndex = state.currentQuestionIndex + 1
        // Don't go beyond total questions
        if (nextIndex < state.totalQuestions) {
          updateData = {
            currentQuestionIndex: nextIndex,
            currentQuestionId: questionId || null,
            questionStartTime: questionId ? new Date() : null,
            countdownActive: false,
            countdownValue: 0,
            isActive: questionId ? true : false,
          }
        } else {
          // Quiz completed
          updateData = {
            isActive: false,
            currentQuestionId: null,
            questionStartTime: null,
            endedAt: new Date(),
            countdownActive: false,
            countdownValue: 0,
          }
        }
        break
      
      case "end_quiz":
        updateData = {
          isActive: false,
          currentQuestionId: null,
          questionStartTime: null,
          endedAt: new Date(),
          countdownActive: false,
          countdownValue: 0,
        }
        break
      
      case "reset":
        updateData = {
          isActive: false,
          currentQuestionIndex: 0,
          currentQuestionId: null,
          questionStartTime: null,
          countdownActive: false,
          countdownValue: 0,
          startedAt: null,
          endedAt: null,
          participants: 0,
          leaderboard: [],
        }
        break
      
      case "update_countdown":
        updateData = {
          countdownValue: body.countdownValue || 0,
          countdownActive: (body.countdownValue || 0) > 0,
        }
        break
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    await quizStateCollection.updateOne(
      { _id: state._id },
      { $set: updateData }
    )

    const updatedState = await quizStateCollection.findOne({ _id: state._id })

    return NextResponse.json({
      success: true,
      state: updatedState,
    })
  } catch (error) {
    console.error("Error updating quiz state:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

