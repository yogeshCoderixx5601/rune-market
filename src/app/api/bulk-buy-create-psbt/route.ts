// pages/api/v1/order/createBuyPsbt.ts
import dbConnect from "@/lib/dbconnect";
import { RuneUtxo } from "@/modals";
import { fetchLatestUtxoData } from "@/utils/MarketPlace";
import { buyOrdinalPSBT } from "@/utils/MarketPlace/buying";
import { NextRequest, NextResponse } from "next/server";

interface Items {
  utxo_id: string;
  price: number;
}
interface OrderInput {
  pay_address: string;
  receive_address: string;
  publickey: string;
  fee_rate: number;
  wallet: string;
  runes:Items[];
}

// Validate the POST method and necessary fields in the request
function validateRequest(body: OrderInput): string[] {
  const requiredFields = [
    "publickey", // buyer pubkey
    "pay_address", // buyer address
    "receive_address", //seller address
    "wallet", //connected wallet name
    "fee_rate",
    "runes",
  ];

  const missingFields = requiredFields.filter((field) => {
    //@ts-ignore
    const value = body[field];
    return (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "string" && value.trim() === "")
    );
  });

  return missingFields;
}

// Fetch and process the ordItem data
async function processOrdItem(body: OrderInput) {
  const validItems: any[] = []; // Array to store valid item details

  // Loop through each rune in the body
  for (const item of body.runes) {
    const utxo_id = item.utxo_id;

    try {
      // Fetch the latest UTXO data
      const ordItem: any = await fetchLatestUtxoData(utxo_id);
      console.log(ordItem, "-------------ord items");

      // Connect to the database
      await dbConnect();

      // Find the item in the database
      const dbItem: any | null = await RuneUtxo.findOne({
        utxo_id,
        listed: true,
      }).lean();

      // Check if the item is listed and has a valid address
      if (!dbItem || !dbItem.address) {
        throw Error("Item not listed in db");
      }

      // Check if the UTXO details have changed
      if (
        (ordItem && ordItem.address && ordItem.address !== dbItem.address) ||
        dbItem.output !== ordItem.output
      ) {
        // Update the database item if it has expired
        dbItem.listed = false;
        dbItem.listed_price = 0;
        dbItem.address = ordItem.address;
        dbItem.output = ordItem.output;
        dbItem.value = ordItem.value;
        dbItem.in_mempool = false;
        dbItem.signed_psbt = "";
        dbItem.unsigned_psbt = "";
        await dbItem.save();
        throw Error("PSBT Expired");
      }

      // Check if the price has changed
      if (dbItem.listed_price !== item.price) {
        throw Error("Item Price has been updated. Refresh Page.");
      }

      validItems.push(dbItem);

      console.log(validItems, "------------validItems");
    } catch (error:any) {
      // Handle and log errors
      console.error("Error processing item:", error.message);
    }
  }

  // Call buyOrdinalPSBT with the array of valid items
  if (validItems.length > 0) {
    const result:any = await buyOrdinalPSBT(
      validItems,
      body.pay_address,
      body.receive_address,
      body.publickey,
      body.wallet,
      body.fee_rate,
    );
    return result;``
  } else {
    throw Error("No valid items found to process");
  }
}

export async function POST(
  req: NextRequest,
  res: NextResponse<{
    ok: Boolean;
    inscription_id?: string;
    price?: number;
    receive_address?: string;
    pay_address?: string;
    unsigned_psbt_base64?: string;
    input_length: number;
    message: string;
    for?: string;
  }>
) {
  console.log("***** BULK BUY CREATE UNSIGNED BUY PSBT API CALLED *****");

  try {
    const body: OrderInput = await req.json();
    console.log(body, "---------body");

    const missingFields = validateRequest(body);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const result = await processOrdItem(body);
    console.log(result, "process order items result");

    // //buy psbt || dummy utxo psbt
    const psbt = result.data.psbt.buyer
      ? result.data.psbt.buyer.unsignedBuyingPSBTBase64
      : result.data.psbt;

    return NextResponse.json({
      ok: true,
     result:{
      unsigned_psbt_base64: psbt,
      input_length:
        result.data.for === "dummy"
          ? 1
          : result.data.psbt.buyer.unsignedBuyingPSBTInputSize,
      // ...result,
      // utxo_id: body.utxo_id,
      receive_address: body.receive_address,
      pay_address: body.pay_address,
      for: result.data.for,}
    });
    // return NextResponse.json({ message: "done" });
  } catch (error:any) {
    console.error(error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || error,
      },
      { status: 500 }
    );
  }
}
