// getting utxos details and runes inside utxo based on rune name
import dbConnect from "@/lib/dbconnect";
import { RuneUtxo } from "@/modals";
import convertParams from "@/utils/api/convertParams";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {

    const query = convertParams(RuneUtxo, req.nextUrl);

    console.log({ finalQueryCbrc: query });

    await dbConnect();

    const result = await RuneUtxo.find(query.find)
      // .where(query.where)
      // .limit(query.limit)
      // .skip(query.start)
      // .lean()
      // .exec();
    console.log(result, "-------------result RuneUtxo");

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
