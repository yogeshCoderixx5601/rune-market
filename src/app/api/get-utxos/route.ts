// getting utxos details and runes inside utxo based on rune name
import dbConnect from "@/lib/dbconnect";
import { RuneUtxo } from "@/modals";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const runeName = req.nextUrl.searchParams.get("rune");
    if (!runeName) {
      return NextResponse.json(
        { success: false, message: "Rune name is required" },
        { status: 400 }
      );
    }
    await dbConnect()

    const decodedRune = decodeURIComponent(runeName);
    console.log(decodedRune,"---decodedRune")

    // Example query to find UTXOs for the specified runeName
    const result = await RuneUtxo.find({
        rune_name: decodedRune,
      });
console.log(result,"---------result rune-utxo")
    return NextResponse.json({
      result,
      success: true,
      message: "User runes fetched successfully",
    });
  } catch (error) {
    console.error("Error in GET /api/rune-utxos:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 }
    );
  }
}
