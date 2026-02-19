import { type NextRequest } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizState } from "@/lib/models"
import {
  getDefaultQuizState,
  getGlobalBestLeaderboard,
  getSessionLeaderboard,
  getSessionParticipantsCount,
} from "@/lib/quiz-session"

export const dynamic = 'force-dynamic'

// Server-Sent Events for real-time updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const userId = request.nextUrl.searchParams.get("userId")

  const buildPayload = async (state: QuizState) => {
    const db = await getDatabase()
    const sessionLeaderboard = await getSessionLeaderboard(db, state.activeSessionId)
    const globalLeaderboard = await getGlobalBestLeaderboard(db)
    const sessionParticipants = await getSessionParticipantsCount(db, state.activeSessionId)

    let userData = null
    if (userId && state.activeSessionId) {
      const quizResultsCollection = db.collection("quizResults")
      const userResult = await quizResultsCollection.findOne({ userId, sessionId: state.activeSessionId })
      if (userResult) {
        let rank = sessionLeaderboard.findIndex((entry) => entry.userId === userId) + 1

        if (rank === 0) {
          const higherScores = await quizResultsCollection.countDocuments({
            sessionId: state.activeSessionId,
            totalPoints: { $gt: userResult.totalPoints || 0 },
          })
          rank = higherScores + 1
        }

        userData = {
          userId: userResult.userId,
          totalPoints: userResult.totalPoints || 0,
          score: userResult.score || 0,
          percentage: userResult.percentage || 0,
          rank,
        }
      }
    }

    return {
      ...state,
      participants: sessionParticipants,
      sessionParticipants,
      leaderboard: sessionLeaderboard,
      globalLeaderboard,
      userData,
    }
  }
  
  const stream = new ReadableStream({
    async start(controller) {
      let isStreamClosed = false

      const send = (data: any) => {
        if (isStreamClosed) return
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          // Ignore errors if stream is closed
          if (!isStreamClosed) {
            console.error("Error sending to stream:", error)
          }
        }
      }

      // Send initial state
      try {
        const db = await getDatabase()
        const quizStateCollection = db.collection<QuizState>("quizState")
        let state = await quizStateCollection.findOne({})
        
        if (!state) {
          const defaultState = getDefaultQuizState(10)
          const result = await quizStateCollection.insertOne(defaultState)
          state = { ...defaultState, _id: result.insertedId }
        }

        send({ type: "state", data: await buildPayload(state) })
      } catch (error) {
        console.error("Error in SSE:", error)
        send({ type: "error", data: { message: "Connection error" } })
      }

      // Poll for updates using recursive setTimeout to prevent overlap
      // and reduce load
      const poll = async () => {
        if (isStreamClosed) return

        try {
          const db = await getDatabase()
          const quizStateCollection = db.collection<QuizState>("quizState")
          
          const state = await quizStateCollection.findOne({})
          
          if (state) {
            send({
              type: "update",
              data: await buildPayload(state),
            })
          }
        } catch (error) {
          console.error("Error polling:", error)
        }

        // Schedule next poll
        if (!isStreamClosed) {
          setTimeout(poll, 2000)
        }
      }

      // Start polling
      poll()

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        isStreamClosed = true
        try {
          controller.close()
        } catch (e) {
          // Ignore if already closed
        }
      })

    
      setTimeout(() => {
        if (!isStreamClosed) {
          isStreamClosed = true
          try {
            controller.close()
          } catch (e) {
            // Ignore
          }
        }
      }, 45000)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}

