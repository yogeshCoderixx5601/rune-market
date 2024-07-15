// Import necessary modules and types from various libraries
import { NextRequest, NextResponse } from "next/server";
import { AddressTxsUtxo } from "@/types";
import * as bitcoin from "bitcoinjs-lib";
import secp256k1 from "@bitcoinerlab/secp256k1";
import dbConnect from "@/lib/dbconnect";
import {
  getSellerOrdOutputValue,
  getTxHexById,
  toXOnly,
} from "@/utils/MarketPlace";
import { testnet } from "bitcoinjs-lib/src/networks";
import { RuneUtxo } from "@/modals";

// Initialize the ECC library for bitcoinjs-lib
bitcoin.initEccLib(secp256k1);

// Define the interface for the order input
interface OrderInput {
  utxo_id: string;
  price: number; 
  wallet: "Leather" | "Xverse" | "MagicEden" | "Unisat";
  receive_address: string; // cardinal
  publickey: string; // runes pub key
  maker_fee_bp?: number; // in sats
}

// Validate the POST method and necessary fields in the request step1
function validateRequest(req: NextRequest, body: any): string[] {
  // List of required fields for validation
  const requiredFields = ["wallet", "receiveAddress", "publickey", "items"];

  // Check for missing main fields
  const missingFields = requiredFields.filter(
    (field) => !Object.hasOwnProperty.call(body, field)
  );

  // Check if 'items' is an array and not empty
  if (body.items && Array.isArray(body.items) && body.items.length > 0) {
    body.items.forEach((item: any, index: any) => {
      // Check each item for required fields 'utxo_id' and 'price'
      if (!Object.hasOwnProperty.call(item, "utxo_id")) {
        missingFields.push(`items[${index}].utxo_id`);
      }
      if (!Object.hasOwnProperty.call(item, "price")) {
        missingFields.push(`items[${index}].price`);
      }
    });
  } else {
    // If 'items' is missing or not a valid array
    missingFields.push("items");
  }

  return missingFields;
}

// Fetch and process the runesUtxo data step2
async function processrunesUtxo(
  items: any,
  address: string,
  publickey: string,
  wallet: string,
  maker_fee_bp?: number
) {
  console.log(items, "---------items");

  // Create a new empty PSBT (Partially Signed Bitcoin Transaction) instance
  let psbt = new bitcoin.Psbt({
    network: process.env.NEXT_PUBLIC_NETWORK ? testnet : undefined,
  });

  // Connect to the database
  await dbConnect();

  // Initialize the taproot internal key
  let tap_internal_key = "";
  
  // Loop through each item in the items array
  for (let item of items) {
    const { price, utxo_id } = item;
    console.log(price, utxo_id, "--------items details");

    // Fetch the runesUtxo from the database
    const runesUtxo: AddressTxsUtxo | null = await RuneUtxo.findOne({ utxo_id });
    console.log(runesUtxo, "--------------runesUtxo");

    if (!runesUtxo) throw new Error("Item hasn't been added to our DB");

    // Check if the address is a taproot address
    const taprootAddress =
      runesUtxo && runesUtxo?.address && runesUtxo?.address.startsWith("bc1p");

    if (runesUtxo.address && runesUtxo.utxo_id) {
      const [runesUtxoTxId, runesUtxoVout] = runesUtxo.utxo_id.split(":");
      console.log(
        "runesUtxoTxId:",
        runesUtxoTxId,
        "runesUtxoVout:",
        runesUtxoVout
      );

      // Fetch the transaction hex using the transaction ID
      const tx = bitcoin.Transaction.fromHex(await getTxHexById(runesUtxoTxId));

      // Clear witness data if public key is not provided
      if (!publickey) {
        for (const output in tx.outs) {
          try {
            tx.setWitness(parseInt(output), []);
          } catch {}
        }
      }

      // Define the input for the PSBT
      const input: any = {
        hash: runesUtxoTxId,
        index: parseInt(runesUtxoVout),
        ...(!taprootAddress && { nonWitnessUtxo: tx.toBuffer() }),
        witnessUtxo: tx.outs[Number(runesUtxoVout)],
        sighashType:
          bitcoin.Transaction.SIGHASH_SINGLE |
          bitcoin.Transaction.SIGHASH_ANYONECANPAY,
      };

      // Add the taproot internal key if it's a taproot address
      if (taprootAddress) {
        input.tapInternalKey = toXOnly(
          tx.toBuffer().constructor(publickey, "hex")
        );
      }

      console.log({ tapInternalKey: input.tapInternalKey, publickey });

      // Add the input to the PSBT
      psbt.addInput(input);

      // Add the output to the PSBT
      psbt.addOutput({
        address: address,
        value: getSellerOrdOutputValue(price, maker_fee_bp, runesUtxo.value),
      });

      // Set the taproot internal key
      tap_internal_key = taprootAddress ? input.tapInternalKey.toString() : "";
    } else {
      console.debug({
        address: runesUtxo.address,
        output: runesUtxo.utxo_id,
        output_value: runesUtxo.value,
      });
      throw new Error("Ord Provider Unavailable");
    }
  }

  // Get the unsigned PSBT in Base64 format
  const unsignedPsbtBase64 = psbt.toBase64();
  console.log(unsignedPsbtBase64, "----------unsignedPsbtBase64");

  return {
    unsignedPsbtBase64,
    tap_internal_key,
  };
}

// Handle the POST request to create an unsigned PSBT
export async function POST(req: NextRequest, res: NextResponse) {
  console.log("***** CREATE UNSIGNED PSBT API CALLED bulk listing *****");

  try {
    // Parse the request body
    const body = await req.json();
    console.log(body, "-------------body");

    // Validate the request
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

    const { receiveAddress, wallet, publickey, items, maker_fee_bp } = body;

    // Process the runesUtxo data and create the PSBT
    const { unsignedPsbtBase64, tap_internal_key } = await processrunesUtxo(
      items,
      receiveAddress,
      publickey,
      wallet,
      maker_fee_bp
    );

    console.log("price:", items);

    // Return the response with the unsigned PSBT and other data
    return NextResponse.json({
      success: true,
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




// // app/api/order/create-listing-psbt/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { AddressTxsUtxo } from "@/types";
// import * as bitcoin from "bitcoinjs-lib";
// import secp256k1 from "@bitcoinerlab/secp256k1";
// import dbConnect from "@/lib/dbconnect";
// import {
//   getSellerOrdOutputValue,
//   getTxHexById,
//   toXOnly,
// } from "@/utils/MarketPlace";
// import { testnet } from "bitcoinjs-lib/src/networks";
// import { RuneUtxo } from "@/modals";

// bitcoin.initEccLib(secp256k1);

// interface OrderInput {
//   utxo_id: string;
//   price: number; 
//   wallet: "Leather" | "Xverse" | "MagicEden" | "Unisat";
//   receive_address: string; //cardinal
//   publickey: string; //runes pub key
//   maker_fee_bp?: number; // in sats
// }

// // Validate the POST method and necessary fields in the request step1
// function validateRequest(req: NextRequest, body: any): string[] {
//   const requiredFields = ["wallet", "receiveAddress", "publickey", "items"];

//   // Check for missing main fields
//   const missingFields = requiredFields.filter(
//     (field) => !Object.hasOwnProperty.call(body, field)
//   );

//   // Check if 'items' is an array and not empty
//   if (body.items && Array.isArray(body.items) && body.items.length > 0) {
//     body.items.forEach((item: any, index: any) => {
//       // Check each item for required fields 'utxo_id' and 'price'
//       if (!Object.hasOwnProperty.call(item, "utxo_id")) {
//         missingFields.push(`items[${index}].utxo_id`);
//       }
//       if (!Object.hasOwnProperty.call(item, "price")) {
//         missingFields.push(`items[${index}].price`);
//       }
//     });
//   } else {
//     // If 'items' is missing or not a valid array
//     missingFields.push("items");
//   }

//   return missingFields;
// }

// // Fetch and process the runesUtxo data step2
// async function processrunesUtxo(
//   items: any,
//   address: string,
//   publickey: string,
//   wallet: string,
//   maker_fee_bp?: number
// ) {
//   console.log(items, "---------items");

//   let psbt = new bitcoin.Psbt({
//     network: process.env.NEXT_PUBLIC_NETWORK ? testnet : undefined,
//   });
//   // let psbt = new bitcoin.Psbt(undefined);
//   await dbConnect();
//   //   finding inscription *inscription_id

//   let tap_internal_key = ""
//   for(let item of items){

//     const { price, utxo_id } = item;

//     console.log(price, utxo_id, "--------items details");

//     const runesUtxo: AddressTxsUtxo | null = await RuneUtxo.findOne({
//       utxo_id,
//     });

//     console.log(runesUtxo, "--------------runesUtxo");

//     if (!runesUtxo) throw new Error("Item hasn't been added to our DB");

//     const taprootAddress =
//       runesUtxo && runesUtxo?.address && runesUtxo?.address.startsWith("bc1p");

//     if (runesUtxo.address && runesUtxo.utxo_id) {
//       const [runesUtxoTxId, runesUtxoVout] = runesUtxo.utxo_id.split(":");

//       console.log(
//         "runesUtxoTxId:",
//         runesUtxoTxId,
//         "runesUtxoVout:",
//         runesUtxoVout
//       );
//       // Define the input for the PSBT
//       const tx = bitcoin.Transaction.fromHex(await getTxHexById(runesUtxoTxId));

//       if (!publickey) {
//         for (const output in tx.outs) {
//           try {
//             tx.setWitness(parseInt(output), []);
//           } catch {}
//         }
//       }
//       // change
//       const input: any = {
//         hash: runesUtxoTxId,
//         index: parseInt(runesUtxoVout),
//         ...(!taprootAddress && { nonWitnessUtxo: tx.toBuffer() }),
//         witnessUtxo: tx.outs[Number(runesUtxoVout)],
//         sighashType:
//           bitcoin.Transaction.SIGHASH_SINGLE |
//           bitcoin.Transaction.SIGHASH_ANYONECANPAY,
//       };
//       if (taprootAddress) {
//         input.tapInternalKey = toXOnly(
//           tx.toBuffer().constructor(publickey, "hex")
//         );
//       }

//       console.log({ tapInternalKey: input.tapInternalKey, publickey });

//       psbt.addInput(input);
//       psbt.addOutput({
//         address: address,
//         value: getSellerOrdOutputValue(price, maker_fee_bp, runesUtxo.value),
//       });

//       tap_internal_key =  taprootAddress ? input.tapInternalKey.toString() : ""

//     } else {
//       console.debug({
//         address: runesUtxo.address,
//         output: runesUtxo.utxo_id,
//         output_value: runesUtxo.value,
//       });
//       throw new Error("Ord Provider Unavailable");
//     }
 
//   }

//   const unsignedPsbtBase64 = psbt.toBase64();
//   console.log(unsignedPsbtBase64,"----------unsignedPsbtBase64")
//   return {
//     unsignedPsbtBase64,
//     tap_internal_key,
//   };
// }

// export async function POST(req: NextRequest, res: NextResponse) {
//   console.log("***** CREATE UNSIGNED PSBT API CALLED bulk listing *****");
//   try {
//     const body = await req.json();
//     console.log(body, "-------------body");

//     const missingFields = validateRequest(req, body);
//     if (missingFields.length > 0) {
//       return NextResponse.json(
//         {
//           ok: false,
//           message: `Missing required fields: ${missingFields.join(", ")}`,
//         },
//         { status: 400 }
//       );
//     }

//     const { receiveAddress, wallet, publickey, items, maker_fee_bp } = body;

//     const { unsignedPsbtBase64, tap_internal_key } = await processrunesUtxo(
//       items,
//       receiveAddress,
//       publickey,
//       wallet,
//       maker_fee_bp
//     );
// console.log("price:" ,items)
//     return NextResponse.json({
//       success: true,
//       // utxo_id: body.utxo_id,
//       // price: Math.floor(items.price),
//       receive_address: body.receive_address,
//       unsigned_psbt_base64: unsignedPsbtBase64,
//       tap_internal_key,
//       message: "Success",
//     });
//   } catch (error:any) {
//     console.log(error, "error");
//     if (!error?.status) console.error("Catch Error: ", error);
//     return NextResponse.json(
//       { message: error.message || error || "Error fetching inscriptions" },
//       { status: error.status || 500 }
//     );
//   }
// }
