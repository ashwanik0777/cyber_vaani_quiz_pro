import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizResult, QuizState } from "@/lib/models"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rollNo = searchParams.get("rollNo")
    const mobileNo = searchParams.get("mobileNo")
    const email = searchParams.get("email")

    if (!rollNo && !mobileNo && !email) {
      return NextResponse.json({ error: "At least one identifier is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const quizResultsCollection = db.collection<QuizResult>("quizResults")
    const quizStateCollection = db.collection<QuizState>("quizState")
    const state = await quizStateCollection.findOne({})
    const activeSessionId = state?.activeSessionId || null

    const query: any = { $or: [] }
    if (rollNo) query.$or.push({ rollNo })
    if (mobileNo) query.$or.push({ mobileNo })
    if (email) query.$or.push({ email })

    const anyResult = await quizResultsCollection.findOne(query)

    let sessionResult: QuizResult | null = null
    if (activeSessionId) {
      sessionResult = await quizResultsCollection.findOne({
        ...query,
        sessionId: activeSessionId,
      })
    }

    return NextResponse.json({
      hasCompleted: !!sessionResult,
      hasCompletedInSession: !!sessionResult,
      hasCompletedAny: !!anyResult,
      activeSessionId,
      result: sessionResult || null,
    })
  } catch (error) {
    console.error("Error checking quiz completion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
