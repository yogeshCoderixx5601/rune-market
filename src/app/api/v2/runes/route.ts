import dbConnect from "@/lib/dbconnect";
import { RuneUtxo } from "@/modals";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  console.log("***********INSIDE GET RUNES API**********");
  try {
    await dbConnect();

    const result = await RuneUtxo.aggregate([
  {
    $match: {
      listed: true
    }
  },
  {
    $group: {
      _id: {
        rune_name: "$rune_name",
        rune_symbol: "$rune_symbol",
        rune_divisibility: "$rune_divisibility",
        listed_price_per_token: "$listed_price_per_token",
      },
      total_amount: { $sum: "$rune_amount" },
      total_utxos: { $sum: 1 } // Counting total UTXOs per group
    },
  },
  {
    $project: {
      _id: 0,
      rune_name: "$_id.rune_name",
      rune_symbol: "$_id.rune_symbol",
      rune_divisibility: "$_id.rune_divisibility",
      listed_price_per_token: "$_id.listed_price_per_token",
      total_amount: 1,
      total_utxos: 1,
    },
  },
]);


       console.log(result, "RESULT");

    return NextResponse.json({
      success: true,
      message: "Runes fetched successfully",
      result,
    });
  } catch (error: any) {
    console.error("Error fetching runes:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "An unknown error occurred",
    });
  }
}
