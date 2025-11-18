import { type NextRequest } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizState } from "@/lib/models"

// Server-Sent Events for real-time updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Send initial state
      try {
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
            totalQuestions: 10,
            startedAt: null,
            endedAt: null,
            participants: 0,
            leaderboard: [],
          }
          const result = await quizStateCollection.insertOne(defaultState)
          state = { ...defaultState, _id: result.insertedId }
        }

        send({ type: "state", data: state })
      } catch (error) {
        console.error("Error in SSE:", error)
        send({ type: "error", data: { message: "Connection error" } })
      }

      // Poll for updates every 500ms
      const interval = setInterval(async () => {
        try {
          const db = await getDatabase()
          const quizStateCollection = db.collection<QuizState>("quizState")
          const quizResultsCollection = db.collection("quizResults")
          
          const state = await quizStateCollection.findOne({})
          
          if (state) {
            // Get leaderboard
            const results = await quizResultsCollection
              .find({})
              .sort({ totalPoints: -1, score: -1 })
              .limit(20)
              .toArray()

            const leaderboard = results.map((result, index) => ({
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

            send({
              type: "update",
              data: {
                ...state,
                leaderboard,
                participants: results.length,
              },
            })
          }
        } catch (error) {
          console.error("Error polling:", error)
        }
      }, 500)

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
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

