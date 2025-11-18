import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { QuizResult } from "@/lib/models"

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

    const query: any = { $or: [] }
    if (rollNo) query.$or.push({ rollNo })
    if (mobileNo) query.$or.push({ mobileNo })
    if (email) query.$or.push({ email })

    const result = await quizResultsCollection.findOne(query)

    return NextResponse.json({
      hasCompleted: !!result,
      result: result || null,
    })
  } catch (error) {
    console.error("Error checking quiz completion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
