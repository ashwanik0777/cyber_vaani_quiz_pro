import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PATCH(request: NextRequest) {
  try {
    // Simple admin authentication check
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, rewardGiven } = body

    if (!userId || typeof rewardGiven !== "boolean") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    const db = await getDatabase()
    const quizResultsCollection = db.collection("quizResults")

    const result = await quizResultsCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { rewardGiven, updatedAt: new Date() } },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Reward status updated successfully",
    })
  } catch (error) {
    console.error("Error updating reward status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
