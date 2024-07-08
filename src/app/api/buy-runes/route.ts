import dbConnect from "@/lib/dbconnect";
import { RuneUtxo } from "@/modals";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("***********GET ALL RUNES************")
  try {
    await dbConnect();
    const result = await RuneUtxo.find({listed:true})
    .select('-signed_psbt -unsigned_psbt')
    console.log(result, "---------------result");
    return NextResponse.json({ success: true, result: result });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: "no data found" });
  }
}
