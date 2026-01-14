import { type NextRequest } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizState } from "@/lib/models"

export const dynamic = 'force-dynamic'

// Server-Sent Events for real-time updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const userId = request.nextUrl.searchParams.get("userId")
  
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
        if (isStreamClosed) {
          clearInterval(interval)
          return
        }

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

            let userData = null
            if (userId) {
              const userResult = await quizResultsCollection.findOne({ userId })
              if (userResult) {
                // Determine rank if not in top 20
                let rank = leaderboard.findIndex(entry => entry.userId === userId) + 1
                if (rank === 0) {
                   const higherScores = await quizResultsCollection.countDocuments({
                     totalPoints: { $gt: userResult.totalPoints || 0 }
                   })
                   rank = higherScores + 1
                }
                
                userData = {
                  userId: userResult.userId,
                  totalPoints: userResult.totalPoints || 0,
                  score: userResult.score || 0,
                  percentage: userResult.percentage || 0,
                  rank
                }
              }
            }

            send({
              type: "update",
              data: {
                ...state,
                leaderboard,
                participants: await quizResultsCollection.countDocuments(),
                userData,
              },
            })
          }
        } catch (error) {
          console.error("Error polling:", error)
        }
      }, 500)

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        isStreamClosed = true
        clearInterval(interval)
        try {
          controller.close()
        } catch (e) {
          // Ignore if already closed
        }
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

