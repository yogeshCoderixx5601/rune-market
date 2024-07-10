// getting utxos details and runes inside utxo based on rune name
import dbConnect from "@/lib/dbconnect";
import { RuneUtxo } from "@/modals";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const runeName = req.nextUrl.searchParams.get("rune_name");
    const address = req.nextUrl.searchParams.get("address");

    if (!runeName) {
      return NextResponse.json(
        { success: false, message: "Rune name is required" },
        { status: 400 }
      );
    }
    if (!address) {
      return NextResponse.json(
        { success: false, message: "Address is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const decodedRuneName = decodeURIComponent(runeName);
    const decodedAddress = decodeURIComponent(address);

    const result = await RuneUtxo.find({
      rune_name: decodedRuneName,
      address: decodedAddress,
    });
    console.log(result,"-------------result")

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



