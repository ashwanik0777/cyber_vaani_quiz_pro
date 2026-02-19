import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizState } from "@/lib/models"
import {
  closeSessionMeta,
  createSessionId,
  getDefaultQuizState,
  getGlobalBestLeaderboard,
  getSessionLeaderboard,
  getSessionParticipantsCount,
  upsertSessionMeta,
} from "@/lib/quiz-session"

export const dynamic = 'force-dynamic'

async function getOrCreateState(totalQuestions: number = 10) {
  const db = await getDatabase()
  const quizStateCollection = db.collection<QuizState>("quizState")

  let state = await quizStateCollection.findOne({})
  if (!state) {
    const defaultState = getDefaultQuizState(totalQuestions)
    const result = await quizStateCollection.insertOne(defaultState)
    state = { ...defaultState, _id: result.insertedId }
  }

  return { db, quizStateCollection, state }
}

async function hydrateStateWithLeaderboards(db: Awaited<ReturnType<typeof getDatabase>>, state: QuizState) {
  const sessionLeaderboard = await getSessionLeaderboard(db, state.activeSessionId)
  const globalLeaderboard = await getGlobalBestLeaderboard(db)
  const sessionParticipants = await getSessionParticipantsCount(db, state.activeSessionId)

  return {
    ...state,
    participants: sessionParticipants,
    sessionParticipants,
    leaderboard: sessionLeaderboard,
    globalLeaderboard,
  }
}

// Get current quiz state
export async function GET(request: NextRequest) {
  try {
    const { db, state } = await getOrCreateState()
    const hydratedState = await hydrateStateWithLeaderboards(db, state)

    return NextResponse.json({ success: true, state: hydratedState })
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

    const safeQuestionCount = Math.max(1, Math.min(50, Number(totalQuestions) || 10))
    const { db, quizStateCollection, state } = await getOrCreateState(safeQuestionCount)

    let updateData: Partial<QuizState> = {}
    let nextSessionId = state.activeSessionId || null

    switch (action) {
      case "start_countdown":
        if (!nextSessionId || state.endedAt) {
          nextSessionId = createSessionId()
        }
        updateData = {
          activeSessionId: nextSessionId,
          countdownActive: true,
          countdownValue: 5,
          isActive: false,
          totalQuestions: safeQuestionCount,
          currentQuestionIndex: state.endedAt ? 0 : state.currentQuestionIndex,
          startedAt: state.endedAt ? null : state.startedAt,
          endedAt: null,
        }
        await upsertSessionMeta(db, nextSessionId, safeQuestionCount, new Date())
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
        if (!nextSessionId || state.endedAt) {
          nextSessionId = createSessionId()
        }

        updateData = {
          activeSessionId: nextSessionId,
          isActive: true,
          currentQuestionId: questionId,
          currentQuestionIndex: state.endedAt ? 0 : state.currentQuestionIndex,
          questionStartTime: new Date(),
          countdownActive: false,
          countdownValue: 0,
          startedAt: state.endedAt ? new Date() : (state.startedAt || new Date()),
          endedAt: null,
          totalQuestions: safeQuestionCount,
        }
        await upsertSessionMeta(db, nextSessionId, safeQuestionCount, new Date())
        break
      
      case "next_question":
        // Check if we've reached the question limit
        if (state.currentQuestionIndex >= (state.totalQuestions || 10) - 1) {
          // Quiz completed
          updateData = {
            isActive: false,
            currentQuestionId: null,
            questionStartTime: null,
            endedAt: new Date(),
            countdownActive: false,
            countdownValue: 0,
          }
          await closeSessionMeta(db, state.activeSessionId)
        } else {
          updateData = {
            activeSessionId: state.activeSessionId,
            isActive: true,
            currentQuestionIndex: state.currentQuestionIndex + 1,
            currentQuestionId: questionId || null,
            questionStartTime: questionId ? new Date() : null,
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
        await closeSessionMeta(db, state.activeSessionId)
        break
      
      case "reset":
        updateData = {
          activeSessionId: null,
          isActive: false,
          currentQuestionIndex: 0,
          currentQuestionId: null,
          questionStartTime: null,
          countdownActive: false,
          countdownValue: 0,
          totalQuestions: safeQuestionCount,
          startedAt: null,
          endedAt: null,
          participants: 0,
          sessionParticipants: 0,
          leaderboard: [],
          globalLeaderboard: [],
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
    const hydratedState = updatedState ? await hydrateStateWithLeaderboards(db, updatedState) : null

    return NextResponse.json({
      success: true,
      state: hydratedState,
    })
  } catch (error) {
    console.error("Error updating quiz state:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

