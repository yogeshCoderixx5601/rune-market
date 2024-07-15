// app/api/v2/order/list-item.ts
import { NextRequest, NextResponse } from "next/server";
import { AddressTxsUtxo } from "@/types";
// import { runeUtxo, Wallet } from "@/models";
// import { getCache, setCache } from "@/lib/cache";
import { getBTCPriceInDollars } from "@/utils";
import {
  addFinalScriptWitness,
  verifySignature,
} from "@/utils/MarketPlace/Listiing";
import { RuneUtxo } from "@/modals";

import * as bitcoin from "bitcoinjs-lib";
import secp256k1 from "@bitcoinerlab/secp256k1";
import { fromXOnly, getTxHexById } from "@/utils/MarketPlace";
import { testnet } from "bitcoinjs-lib/src/networks";
import dbConnect from "@/lib/dbconnect";
interface OrderInput {
  unsigned_listing_psbt_base64: string;
  tap_internal_key: string;
  listing: Listing;
  signed_listing_psbt_base64: string;
}

interface Listing {
  seller: Seller;
}

interface Seller {
  maker_fee_bp?: number;
  seller_ord_address: string;
  receiveAddress: string;
  price: number;
  tap_internal_key: string;
  unsigned_listing_psbt_base64: string;
}

export async function POST(req: NextRequest) {
  console.log("***** BULK SIGN API CALLED *****");

  const itemData = await req.json();
  const orderInput = itemData.params.listData;
  // console.log(orderInput, "--------------order items");
  // Ensure orderInput contains all necessary fields
  const requiredFields = [
    "items",
    "unsigned_listing_psbt_base64",
    "tap_internal_key",
    "signed_listing_psbt_base64",
  ];
  const missingFields = requiredFields.filter(
    (field) => !Object.hasOwnProperty.call(orderInput, field)
  );

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    bitcoin.initEccLib(secp256k1);
    if (
      orderInput.receiveAddress
      //   &&
      //   orderInput.utxo_id &&
      //   orderInput.price
    ) {
      // console.log("adding final script witness");

      const psbt = addFinalScriptWitness(orderInput.signed_listing_psbt_base64);
      if (
        orderInput.receiveAddress.startsWith("bc1p") ||
        orderInput.receiveAddress.startsWith("tb1q")
      ) {
        const validSig = verifySignature(psbt);
        // console.log(validSig, "-----------validSig");
        if (!validSig) {
          return NextResponse.json(
            {
              ok: false,
              message: "Invalid signature",
            },
            { status: 500 }
          );
        }
      }

      console.log("parse it");
      let parsedPsbt = bitcoin.Psbt.fromBase64(
        orderInput.signed_listing_psbt_base64,
        {
          network: process.env.NEXT_PUBLIC_NETWORK ? testnet : undefined,
        }
      );

      console.log(parsedPsbt, "----------parsedPsbt");
      console.log(parsedPsbt.txInputs[0]);

      let count = 0;
      for (const input of parsedPsbt.txInputs) {
        const txid = input.hash.reverse().toString("hex");
        const vout = input.index;
        const utxo_id = txid + ":" + vout;

        await dbConnect();
        const runeUtxo = await RuneUtxo.findOne({ utxo_id });
        //create an new empty psbt
        let psbt = new bitcoin.Psbt({
          network: process.env.NEXT_PUBLIC_NETWORK ? testnet : undefined,
        });

        (psbt.data.globalMap.unsignedTx as any).tx.ins[0] = (parsedPsbt.data
          .globalMap.unsignedTx as any).tx.ins[count];

        psbt.data.inputs[0] = parsedPsbt.data.inputs[count];

        psbt.addOutput(parsedPsbt.txOutputs[count]);
        console.log("adding data input and output");
        const b64 = psbt.toBase64();

        console.log(b64, "-------------b64");

        if (runeUtxo) {
          const price = orderInput.items?.find(
            (a: any) => a.utxo_id === utxo_id
          )?.price;
          console.log(price, "---price");
          let listed_price_per_token = 0;
          let totalRunes =
            runeUtxo.rune_amount / Math.pow(10, runeUtxo.rune_divisibility);
          console.log(totalRunes, "-----------totalRunes");
          if (runeUtxo && runeUtxo.length > 0) {
            listed_price_per_token = totalRunes / price;
          }
          runeUtxo.listed = true;
          runeUtxo.listed_at = new Date();
          runeUtxo.listed_price = price || 0;
          runeUtxo.listed_price_per_token = listed_price_per_token;
          runeUtxo.listed_seller_receive_address = orderInput.receiveAddress;
          runeUtxo.signed_psbt = b64;
          runeUtxo.listed_maker_fee_bp = orderInput.maker_fee_bp || 100;
          await runeUtxo.save();
          console.log(runeUtxo, "----------rune runesData");

          let docObject = runeUtxo.toObject();
          delete docObject.__v; // remove version key
          delete docObject._id; // remove _id if you don't need it
          console.log("Updated listing");
        }

        count++;
      }
      return NextResponse.json({
        ok: true,
        // result: { utxo_id: orderInput.utxo_id, price: orderInput.price },
        message: "list and sign utxo done",
      });
    } else {
      throw Error("Ord Provider Unavailable");
    }
  } catch (error:any) {
    console.error(error);
    return NextResponse.json(
      {
        ok: false,
        utxo_id: orderInput.utxo_id,
        price: orderInput.price,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
