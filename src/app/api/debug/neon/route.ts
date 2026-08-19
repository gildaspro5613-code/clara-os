import { NextResponse } from "next/server";
import { sql } from "@/lib/core/store/database";

export async function GET() {
  try {
    const result = await sql`SELECT 1 AS ok`;

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown database error.",
      },
      { status: 500 },
    );
  }
}
