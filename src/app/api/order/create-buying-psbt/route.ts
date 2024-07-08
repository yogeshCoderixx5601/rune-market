// pages/api/v1/order/createBuyPsbt.ts
import dbConnect from "@/lib/dbconnect";
import { RuneUtxo } from "@/modals";
import {  fetchLatestUtxoData } from "@/utils/MarketPlace";
import { buyOrdinalPSBT } from "@/utils/MarketPlace/buying";
import { NextRequest, NextResponse } from "next/server";

interface OrderInput {
  utxo_id: string;
  pay_address: string;
  receive_address: string;
  publickey: string;
  fee_rate: number;
  wallet: string;
  price: number; //in_sats
}

// Validate the POST method and necessary fields in the request
function validateRequest(body: OrderInput): string[] {
  const requiredFields = [
    "utxo_id", // rune utxo_id
    "publickey", // buyer pubkey
    "pay_address", // buyer address
    "receive_address", //seller address
    "wallet", //connected wallet name
    "fee_rate",
    "price", // listed price
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
async function processOrdItem(
  utxo_id: string,
  receive_address: string,
  pay_address: string,
  publickey: string,
  wallet: string,
  fee_rate: number,
  expected_price: number
) {
  const ordItem: any = await fetchLatestUtxoData(utxo_id);
  // console.log(ordItem,"---order items")
  await dbConnect();
  const dbItem: any | null = await RuneUtxo.findOne({
    utxo_id,
    listed: true,
  });
    // .populate("official_collection");

  // console.log("got db listing");

  if (!dbItem || !dbItem.address) {
    throw Error("Item not listed in db");
  }
  if (
    (ordItem && ordItem.address && ordItem.address !== dbItem.address) ||
    dbItem.output !== ordItem.output
  ) {

    dbItem.listed = false;
    dbItem.listed_price = 0;
    dbItem.address = ordItem.address;
    dbItem.output = ordItem.output;
    dbItem.value = ordItem.value;
    dbItem.in_mempool = false;
    dbItem.signed_psbt = "";
    dbItem.unsigned_psbt = "";
    dbItem.save();
    throw Error("PSBT Expired");
  }
  if (dbItem.listed_price !== expected_price) {
    // console.log({ price: dbItem.listed_price, expected_price });
    throw Error("Item Price has been updated. Refresh Page.");
  }
  if (
    ordItem.address &&
    dbItem.signed_psbt  &&
    dbItem.listed_price &&
    // ordItem.utxo_id &&
    ordItem.value
  ) {
    const result = await buyOrdinalPSBT(
      pay_address,
      receive_address,
      dbItem,
      dbItem.listed_price,
      publickey,
      wallet,
      fee_rate
    );
    return result;
  } else {
    throw new Error("Ord Provider Unavailable");
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
  console.log("***** CREATE UNSIGNED BUY PSBT API CALLED *****");

  try {
    const body: any = await req.json();
    // console.log(body)
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

    const result = await processOrdItem(
      body.utxo_id,
      body.receive_address,
      body.pay_address,
      body.publickey,
      body.wallet,
      body.fee_rate,
      body.price
    );
    // console.log(result, "process order items result")

    //buy psbt || dummy utxo psbt
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
      utxo_id: body.utxo_id,
      receive_address: body.receive_address,
      pay_address: body.pay_address,
      for: result.data.for,}
    });
  
  
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
