import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export const dynamic = 'force-dynamic'

// Track unique visitor
export async function POST(request: NextRequest) {
  try {
    // Get visitor ID from cookie
    const visitorId = request.cookies.get("visitor_id")?.value

    // Generate unique visitor ID if not exists
    let newVisitorId = visitorId
    if (!newVisitorId) {
      newVisitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    }

    const db = await getDatabase()
    const visitorsCollection = db.collection("visitors")

    // Check if visitor already exists
    const existingVisitor = await visitorsCollection.findOne({ visitorId: newVisitorId })

    if (!existingVisitor) {
      // New unique visitor
      await visitorsCollection.insertOne({
        visitorId: newVisitorId,
        firstVisit: new Date(),
        lastVisit: new Date(),
        visitCount: 1,
      })
    } else {
      // Update last visit
      await visitorsCollection.updateOne(
        { visitorId: newVisitorId },
        {
          $set: { lastVisit: new Date() },
          $inc: { visitCount: 1 },
        }
      )
    }

    // Get total unique visitors count
    const totalVisitors = await visitorsCollection.countDocuments()

    const response = NextResponse.json({
      success: true,
      isNewVisitor: !existingVisitor,
      totalVisitors,
    })

    // Set cookie for 1 year
    response.cookies.set("visitor_id", newVisitorId, {
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    return response
  } catch (error) {
    console.error("Error tracking visitor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Get visitor count
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const visitorsCollection = db.collection("visitors")

    const totalVisitors = await visitorsCollection.countDocuments()

    return NextResponse.json({
      success: true,
      totalVisitors,
    })
  } catch (error) {
    console.error("Error getting visitor count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

