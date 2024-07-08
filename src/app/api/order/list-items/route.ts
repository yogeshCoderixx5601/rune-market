// app/api/order/create-listing-psbt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AddressTxsUtxo } from "@/types";
import * as bitcoin from "bitcoinjs-lib";
import secp256k1 from "@bitcoinerlab/secp256k1";
import dbConnect from "@/lib/dbconnect";
import { getSellerOrdOutputValue, getTxHexById, toXOnly } from "@/utils/MarketPlace";
import { testnet } from "bitcoinjs-lib/src/networks";
import { RuneUtxo } from "@/modals";

bitcoin.initEccLib(secp256k1);

interface OrderInput {
  utxo_id: string;
  price: number; // in sats
  wallet: "Leather" | "Xverse" | "MagicEden" | "Unisat";
  receive_address: string; //cardinal
  publickey: string; //runes pub key
  maker_fee_bp?: number; // in sats
}

// Validate the POST method and necessary fields in the request step1
function validateRequest(req: NextRequest, body: OrderInput): string[] {
  const requiredFields = [
    "utxo_id",
    "price",
    "wallet",
    "receive_address",
    "publickey",
  ];
  const missingFields = requiredFields.filter(
    (field) => !Object.hasOwnProperty.call(body, field)
  );

  return missingFields;
}

// Fetch and process the runesUtxo data step2
async function processrunesUtxo(
  utxo_id: string,
  address: string,
  price: number, //in sats
  publickey: string,
  wallet: string,
  maker_fee_bp?: number
) {
  let psbt = new bitcoin.Psbt({ network: (process.env.NEXT_PUBLIC_NETWORK ?testnet: undefined) });
  // let psbt = new bitcoin.Psbt(undefined);
  await dbConnect();
//   finding inscription *inscription_id
  const runesUtxo: AddressTxsUtxo | null = await RuneUtxo.findOne({
    utxo_id,
  });

  console.log(runesUtxo, "--------------runesUtxo");

  if (!runesUtxo) throw new Error("Item hasn't been added to our DB");

  const taprootAddress =
    runesUtxo && runesUtxo?.address && runesUtxo?.address.startsWith("bc1p");

  if (runesUtxo.address && runesUtxo.utxo_id ) {
    const [runesUtxoTxId, runesUtxoVout] = runesUtxo.utxo_id.split(":");

    console.log("runesUtxoTxId:",runesUtxoTxId,"runesUtxoVout:",runesUtxoVout)
    // Define the input for the PSBT
    const tx = bitcoin.Transaction.fromHex(await getTxHexById(runesUtxoTxId));

    if (!publickey) {
      for (const output in tx.outs) {
        try {
          tx.setWitness(parseInt(output), []);
        } catch {}
      }
    }

    const input: any = {
      hash: runesUtxoTxId,
      index: parseInt(runesUtxoVout),
      ...(!taprootAddress && { nonWitnessUtxo: tx.toBuffer() }),
      witnessUtxo: tx.outs[Number(runesUtxoVout)],
      sighashType:
        bitcoin.Transaction.SIGHASH_SINGLE |
        bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    };
    if (taprootAddress) {
      input.tapInternalKey = toXOnly(
        tx.toBuffer().constructor(publickey, "hex")
      );
    }

    console.log({ tapInternalKey: input.tapInternalKey, publickey });

    psbt.addInput(input);
    psbt.addOutput({
      address: address,
      value: getSellerOrdOutputValue(price, maker_fee_bp, runesUtxo.value),
    });

    const unsignedPsbtBase64 = psbt.toBase64();
    return {
      unsignedPsbtBase64,
      tap_internal_key: taprootAddress ? input.tapInternalKey.toString() : "",
    };
  } else {
    console.debug({
      address: runesUtxo.address,
      output: runesUtxo.utxo_id,
      output_value: runesUtxo.value,
    });
    throw new Error("Ord Provider Unavailable");
  }
}

export async function POST(
  req: NextRequest,
  res: NextResponse<{
    ok: Boolean;
    price?: number;
    receive_address?: string;
    unsigned_psbt_base64?: string;
    message: string;
  }>
) {
  console.log("***** CREATE UNSIGNED PSBT API CALLED *****");
  try {
    const body: OrderInput = await req.json();
    console.log(body,"-------------body")
    const missingFields = validateRequest(req, body);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }
// 1done
    const { unsignedPsbtBase64, tap_internal_key } = await processrunesUtxo(
      body.utxo_id,
      body.receive_address,
      Math.floor(body.price),
      body.publickey,
      body.wallet,
      body.maker_fee_bp
    );
    // 2done
    return NextResponse.json({
      success: true,
      utxo_id: body.utxo_id,
      price: Math.floor(body.price),
      receive_address: body.receive_address,
      unsigned_psbt_base64: unsignedPsbtBase64,
      tap_internal_key,
      message: "Success",
    });
  } catch (error: any) {
    console.log(error, "error");
    if (!error?.status) console.error("Catch Error: ", error);
    return NextResponse.json(
      { message: error.message || error || "Error fetching inscriptions" },
      { status: error.status || 500 }
    );
  }
}


