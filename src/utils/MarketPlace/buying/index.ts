import * as bitcoin from "bitcoinjs-lib";
import secp256k1 from "@bitcoinerlab/secp256k1";
import { AddressTxsUtxo, IListingState, UTXO } from "@/types"; //IListingState
import { getSellerOrdOutputValue, getTxHexById, mapUtxos, toXOnly } from "..";
import { convertSatoshiToBTC, satsToDollars } from "@/utils";
import { testnet } from "bitcoinjs-lib/src/networks";
import { doesUtxoContainRunes, getUtxosByAddress } from "@/utils/GetRunes";
import calculateTxFee from "@/utils/api/calculateTxFee";

export const DUMMY_UTXO_MIN_VALUE = Number(580);
export const DUMMY_UTXO_VALUE = 1000;
const ORDINALS_POSTAGE_VALUE = Number(1000);
export const PLATFORM_FEE_ADDRESS =
  process.env.PLATFORM_FEE_ADDRESS ||
  "bc1qz9fuxrcrta2ut0ad76zlse09e98x9wrr7su7u6";
const BUYING_PSBT_SELLER_SIGNATURE_INDEX = 1;

interface Result {
  status: string;
  message: string;
  data: any;
}
export async function buyOrdinalPSBT(
  dbItems: any,
  pay_address: string,
  receive_address: string,
  publickey: string,
  wallet: string,
  fee_rate: number
): Promise<Result> {
  console.log("*********buyOrdinalPSBT***************");

  const numberOfDummyUtxosToCreate = 2;
  bitcoin.initEccLib(secp256k1);
  let payerUtxos: AddressTxsUtxo[];
  let dummyUtxos: UTXO[] | null;
  let paymentUtxos: AddressTxsUtxo[] | undefined;

  //  console.log({payerAddress})
  try {
    payerUtxos = await getUtxosByAddress(pay_address);
    console.log(payerUtxos.length, "---------payerUtxos");
  } catch (e) {
    // console.error(e);
    return Promise.reject("Mempool error");
  }

  let minimumValueRequired: number;
  let vins: number;
  let vouts: number;

  let price = dbItems.reduce(
    (total: number, a: { listed_price: number }) => total + a.listed_price,
    0
  );
  // console.log(price, "-----------price i get from db items")
  minimumValueRequired = price + numberOfDummyUtxosToCreate * DUMMY_UTXO_VALUE;
  vins = 3;
  vouts = 4 + numberOfDummyUtxosToCreate;

  // add fee to minimumValueRequired

  let platformFeeValue = Math.floor((minimumValueRequired * (0 + 100)) / 10000);
  // Assuming minimumValueRequired is in satoshis
  platformFeeValue = Math.max(Math.round(minimumValueRequired * 0.01), 4000);

  minimumValueRequired = minimumValueRequired + platformFeeValue;

  console.log({ minimumValueRequired });

  try {
    const taprootAddress =
      receive_address.startsWith("bc1p") || receive_address.startsWith("tb1p");
    paymentUtxos = await selectPaymentUtxos(
      payerUtxos,
      minimumValueRequired,
      vins,
      vouts,
      fee_rate,
      taprootAddress
    );
    // console.log(paymentUtxos?.length, "-----------rune utxos");

    let psbt: any = null;

    const listing = {
      seller: {
        makerFeeBp: 100,
        // sellerOrdAddress: runes.address,
        // price: runes.listed_price,
        // ordItem: runes,
        // sellerReceiveAddress: runes.listed_seller_receive_address,
        // signedListingPSBTBase64: runes.signed_psbt,
        // tapInternalKey: runes.tap_internal_key,
      },
      buyer: {
        takerFeeBp: 0,
        buyerAddress: pay_address,
        buyerTokenReceiveAddress: receive_address,
        fee_rate,
        buyerPublicKey: publickey,
        unsignedBuyingPSBTBase64: "",
        buyerDummyUTXOs: [],
        buyerPaymentUTXOs: paymentUtxos,
      },
    };
    console.log("Generating payment PSBT");

    psbt = await generateUnsignedBuyingPSBTBase64(dbItems, listing, wallet);

    return {
      status: "success",
      message: "has valid utxo",
      data: {
        paymentUtxos,
        pay_address,
        psbt,
        for: "buy",
      },
    };
  } catch (e) {
    paymentUtxos = undefined;
    // console.error(e);
    return Promise.reject(e);
  }
}

async function selectDummyUTXOs(
  utxos: AddressTxsUtxo[]
): Promise<UTXO[] | null> {
  const result: UTXO[] = [];
  let counter = 0;

  for (const utxo of utxos) {
    if (utxo.value >= 580 && utxo.value <= 1000) {
      if (await doesUtxoContainRunes(utxo)) {
        continue;
      }
      const mappedUtxo = await mapUtxos([utxo]);
      result.push(mappedUtxo[0]);
      counter++;

      if (counter === 2) {
        break;
      }
    }
  }

  return result;
}

export async function selectPaymentUtxos(
  utxos: AddressTxsUtxo[],
  amount: number, // amount is expected total output (except tx fee)
  vinsLength: number,
  voutsLength: number,
  fee_rate: number,
  taprootAddress: boolean
) {
  const selectedUtxos: any = [];
  let selectedAmount = 0;

  // Sort descending by value, and filter out dummy utxos
  utxos = utxos
    .filter((x) => x.value > DUMMY_UTXO_VALUE)
    .sort((a, b) => b.value - a.value);

  console.log({ utxos }, "FINAL");

  for (const utxo of utxos) {
    // Never spend a utxo that contains an inscription for cardinal purposes

    if (await doesUtxoContainRunes(utxo)) {
      console.log("Rune Present in: ", utxo.txid, utxo.vout);
      continue;
    }
    console.log({ utxo });
    selectedUtxos.push(utxo);
    console.log(selectedUtxos, "---------------selectedUtxos");
    selectedAmount += utxo.value;

    if (
      selectedAmount >=
      amount +
        calculateTxFee(
          vinsLength + selectedUtxos.length,
          voutsLength,
          fee_rate,
          taprootAddress ? "taproot" : "pwpkh", // Adjust based on actual use

          taprootAddress ? "taproot" : "pwpkh",
          1, // Include change output
          taprootAddress ? "taproot" : "pwpkh" // Change output type
        )
    ) {
      break;
    }
  }
  console.log(selectedAmount, "----selected amount");
  if (selectedAmount < amount) {
    console.log(selectedAmount, "----selected amount");
    throw `Your wallet needs ${Number(
      await satsToDollars(amount - selectedAmount)
    ).toFixed(2)} USD more`;
  }

  console.log({ selectedUtxos });
  return selectedUtxos;
}
async function generateUnsignedBuyingPSBTBase64(
  dbItems: any,
  listing: any,
  wallet: string
) {
  wallet = wallet.toLowerCase();
  const psbt = new bitcoin.Psbt({
    network:
      process.env.NEXT_PUBLIC_NETWORK === "testnet" ? testnet : undefined,
  });

  const taprootAddress =
    listing?.buyer?.buyerAddress.startsWith("bc1p") ||
    listing?.buyer?.buyerAddress.startsWith("tb1p");

  const segwitAddress =
    listing?.buyer?.buyerAddress.startsWith("bc1q") ||
    listing?.buyer?.buyerAddress.startsWith("tb1q");

  const buyerPublicKey = listing?.buyer?.buyerPublicKey;

  if (
    !listing.buyer ||
    !listing.buyer.buyerAddress ||
    !listing.buyer.buyerTokenReceiveAddress
  ) {
    throw new Error("Buyer address is not set");
  }
  // if (!listing.seller.ordItem.value) {
  //   throw Error("Inscription has no output value");
  // }

  let totalInput = 0;

  console.log("add output");
  // Add ordinal output
  psbt.addOutput({
    address: listing.buyer.buyerTokenReceiveAddress,
    value: ORDINALS_POSTAGE_VALUE,
  });

  const latestBuyerInput = [];

  for (const utxo of listing.buyer.buyerPaymentUTXOs) {
    const tx = bitcoin.Transaction.fromHex(await getTxHexById(utxo.txid));

    // Loop through outputs of the transaction
    for (const output in tx.outs) {
      try {
        // Attempt to set an empty witness for each output
        tx.setWitness(parseInt(output), []);
      } catch {}
    }

    const input: any = {
      hash: utxo.txid,
      index: utxo.vout,
      // Include non-witness UTXO if taprootAddress is defined
      ...(taprootAddress && {
        nonWitnessUtxo: tx.toBuffer(),
      }),
    };

    if (!taprootAddress) {
      // Construct redeem script for P2WPKH (pay-to-witness-public-key-hash)
      const redeemScript = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(listing.buyer.buyerPublicKey!, "hex"),
      }).output;

      // Create P2SH (pay-to-script-hash) from redeem script
      const p2sh = bitcoin.payments.p2sh({
        redeem: { output: redeemScript },
      });

      // Handle different wallets
      if (wallet !== "unisat") {
        input.witnessUtxo = tx.outs[utxo.vout];
        // Set redeem script for specific wallets
        if (!segwitAddress && (wallet === "xverse" || wallet === "magiceden")) {
          input.redeemScript = p2sh.redeem?.output;
        }
      } else {
        // Handle unisat wallet inputs
        input.witnessUtxo = tx.outs[utxo.vout];
      }
    } else {
      // Handle taproot address case
      input.witnessUtxo = tx.outs[utxo.vout];
      input.tapInternalKey = toXOnly(
        tx.toBuffer().constructor(listing.buyer.buyerPublicKey, "hex")
      );
    }

    if (!totalInput) {
      // Add input to PSBT
      psbt.addInput(input);
    } else {
      latestBuyerInput.push(input);
    }

    // Accumulate total input value
    totalInput += utxo.value;
  }

  for (const dbItem of dbItems) {
    const { sellerInput, sellerOutput } = await getSellerInputAndOutput(dbItem);

    psbt.addInput(sellerInput);
    psbt.addOutput(sellerOutput);
  }

  if (latestBuyerInput.length > 0) {
    for (const input of latestBuyerInput) {
      psbt.addInput(input);
    }
  }

  const fee = calculateTxFee(
    psbt.txInputs.length,
    psbt.txOutputs.length, // 2-dummy outputs
    listing.buyer.fee_rate,
    "pwpkh",
    taprootAddress ? "taproot" : "pwpkh"
  );

  const totalOutput = psbt.txOutputs.reduce(
    (partialSum, a) => partialSum + a.value,
    0
  );

  let totalValue = dbItems.reduce(
    (total: number, a: { value: number }) => total + a.value,
    0
  );
  console.log(totalValue, "----------------total value");

  const changeValue = totalInput - totalOutput - fee;

  if (changeValue < 0) {
    throw `Your wallet needs ${Number(
      await satsToDollars(-changeValue)
    ).toFixed(2)} USD more`;
    throw `Your wallet address doesn't have enough funds to buy this inscription.
Price:      ${convertSatoshiToBTC(listing.seller.price)} BTC
Required:   ${convertSatoshiToBTC(totalOutput + fee)} BTC
Missing:    ${convertSatoshiToBTC(-changeValue)} BTC`;
  }

  // Change utxo
  if (changeValue > DUMMY_UTXO_MIN_VALUE) {
    console.log("---------inside changeValue > dumy utxo");
    psbt.addOutput({
      address: listing.buyer.buyerAddress,
      value: changeValue + totalValue,
    });
  }

  console.log({ totalInput, totalOutput, fee, changeValue, totalValue });
  // console.dir(psbt, { depth: null });

  listing.buyer.unsignedBuyingPSBTBase64 = psbt.toBase64();
  listing.buyer.unsignedBuyingPSBTInputSize = psbt.data.inputs.length;
  return listing;
}

async function getSellerInputAndOutput(dbItem: any) {
  if (!dbItem.utxo_id) {
    throw Error("runes has no utxo id");
  }
  const [ordinalUtxoTxId, ordinalUtxoVout] = dbItem.utxo_id.split(":");
  const tx = bitcoin.Transaction.fromHex(await getTxHexById(ordinalUtxoTxId));
  // No need to add this witness if the seller is using taproot
  if (!dbItem.tap_internal_key) {
    for (let outputIndex = 0; outputIndex < tx.outs.length; outputIndex++) {
      try {
        tx.setWitness(outputIndex, []);
      } catch {}
    }
  }

  const sellerInput: any = {
    hash: ordinalUtxoTxId,
    index: parseInt(ordinalUtxoVout),
    nonWitnessUtxo: tx.toBuffer(),
    // No problem in always adding a witnessUtxo here
    witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
  };
  // If taproot is used, we need to add the internal key
  if (dbItem.tap_internal_ey) {
    sellerInput.tap_internal_key = toXOnly(
      tx.toBuffer().constructor(dbItem.tap_internal_key, "hex")
    );
    // console.log(sellerInput.tapInternalKey.toString("hex"), "tik");
  }
  if (!dbItem.value) {
    throw Error("Inscription has no output value");
  }

  const ret = {
    sellerInput,
    sellerOutput: {
      address: dbItem.listed_seller_receive_address,
      value: getSellerOrdOutputValue(
        dbItem.listed_price,
        dbItem.makerFeeBp,
        dbItem.value
      ),
    },
  };

  return ret;
}

export function mergeSignedBuyingPSBTBase64(
  signedListingPSBTBase64: string,
  signedBuyingPSBTBase64: string
): string {
  // console.log("[INFO] Initiating merging of signed PSBTs.");

  // Deserialize PSBTs from Base64
  // console.log("[INFO] Deserializing seller PSBTs from Base64.");
  const sellerSignedPsbt = bitcoin.Psbt.fromBase64(signedListingPSBTBase64);
  console.log(sellerSignedPsbt);
  // console.log("[INFO] Deserializing buyer PSBTs from Base64.");
  const buyerSignedPsbt = bitcoin.Psbt.fromBase64(signedBuyingPSBTBase64);

  // Merge operations
  // console.log("[INFO] Merging seller's signature into buyer's PSBT.");

  (buyerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[
    BUYING_PSBT_SELLER_SIGNATURE_INDEX
  ] = (sellerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[0];

  buyerSignedPsbt.data.inputs[BUYING_PSBT_SELLER_SIGNATURE_INDEX] =
    sellerSignedPsbt.data.inputs[0];

  // console.log("[SUCCESS] Merging completed successfully.");

  // Return serialized PSBT
  // console.log("[INFO] Serializing merged PSBT to Base64.");
  return buyerSignedPsbt.toBase64();
}

export function mergeSignedBulkBuyingPSBTBase64(
  items: { utxo_id: string; signed_psbt: string }[],
  signedBuyingPSBTBase64: string
): string {
  // console.log("[INFO] Initiating merging of signed PSBTs.");

  // console.log("[INFO] Deserializing buyer PSBTs from Base64.");
  const buyerSignedPsbt = bitcoin.Psbt.fromBase64(signedBuyingPSBTBase64);

  for (const utxo of items) {
    // Deserialize PSBTs from Base64
    // console.log("[INFO] Deserializing seller PSBTs from Base64.");
    const sellerSignedPsbt = bitcoin.Psbt.fromBase64(utxo.signed_psbt);
    // console.log(sellerSignedPsbt);
    const index = buyerSignedPsbt.txInputs.findIndex(
      (a) => a.hash.reverse().toString("hex") + ":" + a.index === utxo.utxo_id
    );

    // Merge operations
    // console.log("[INFO] Merging seller's signature into buyer's PSBT.");

    (buyerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[
      index
    ] = (sellerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[0];

    buyerSignedPsbt.data.inputs[index] = sellerSignedPsbt.data.inputs[0];
  }

  // console.log("[SUCCESS] Merging completed successfully.");

  // Return serialized PSBT
  // console.log("[INFO] Serializing merged PSBT to Base64.");
  return buyerSignedPsbt.toBase64();
}

// import * as bitcoin from "bitcoinjs-lib";
// import secp256k1 from "@bitcoinerlab/secp256k1";
// import { AddressTxsUtxo, IListingState, UTXO } from "@/types"; //IListingState
// import { getSellerOrdOutputValue, getTxHexById, mapUtxos, toXOnly } from "..";
// import { convertSatoshiToBTC, satsToDollars } from "@/utils";
// import calculateTxFee from "@/utils/api/calculateTxFee";
// import { testnet } from "bitcoinjs-lib/src/networks";
// import { doesUtxoContainRunes, getUtxosByAddress } from "@/utils/GetRunes";

// export const DUMMY_UTXO_MIN_VALUE = Number(580);
// export const DUMMY_UTXO_VALUE = 1000;
// const ORDINALS_POSTAGE_VALUE = Number(1000);
// export const PLATFORM_FEE_ADDRESS =
//   process.env.PLATFORM_FEE_ADDRESS ||
//   "bc1qz9fuxrcrta2ut0ad76zlse09e98x9wrr7su7u6";
// const BUYING_PSBT_SELLER_SIGNATURE_INDEX = 1;

// interface Result {
//   status: string;
//   message: string;
//   data: any;
// }
// export async function buyOrdinalPSBT(
//   payerAddress: string,
//   receiverAddress: string,
//   runes: any,
//   price: number,
//   publickey: string,
//   wallet: string,
//   fee_rate: number
// ): Promise<Result> {
//   const numberOfDummyUtxosToCreate = 2;
//   bitcoin.initEccLib(secp256k1);
//   let payerUtxos: AddressTxsUtxo[];
//   let dummyUtxos: UTXO[] | null;
//   let paymentUtxos: AddressTxsUtxo[] | undefined;

//   //  console.log({payerAddress})
//   try {
//     payerUtxos = await getUtxosByAddress(payerAddress);
//     console.log(payerUtxos.length, "---------payerUtxos");
//   } catch (e) {
//     // console.error(e);
//     return Promise.reject("Mempool error");
//   }

//   // dummyUtxos = await selectDummyUTXOs(payerUtxos);
//   let minimumValueRequired: number;
//   let vins: number;
//   let vouts: number;

//   // if (!dummyUtxos || dummyUtxos.length < 2) {
//   //   console.log("Lacking dummy utxos");
//   //   minimumValueRequired = numberOfDummyUtxosToCreate * DUMMY_UTXO_VALUE;
//   //   vins = 0;
//   //   vouts = numberOfDummyUtxosToCreate;
//   // } else

//   minimumValueRequired = price + numberOfDummyUtxosToCreate * DUMMY_UTXO_VALUE;
//   vins = 3;
//   vouts = 4 + numberOfDummyUtxosToCreate;

//   // add fee to minimumValueRequired

//   let platformFeeValue = Math.floor((minimumValueRequired * (0 + 100)) / 10000);
//   // Assuming minimumValueRequired is in satoshis
//   platformFeeValue = Math.max(Math.round(minimumValueRequired * 0.01), 4000);

//   minimumValueRequired = minimumValueRequired + platformFeeValue;

//   console.log({ minimumValueRequired });

//   try {
//     const taprootAddress =
//       receiverAddress.startsWith("bc1p") || receiverAddress.startsWith("tb1p");
//     paymentUtxos = await selectPaymentUtxos(
//       payerUtxos,
//       minimumValueRequired,
//       vins,
//       vouts,
//       fee_rate,
//       taprootAddress
//     );
//     console.log(paymentUtxos?.length, "-----------rune utxos");

//     let psbt: any = null;

//     if (
//       // dummyUtxos &&
//       // dummyUtxos.length >= 2 &&
//       runes.address &&
//       runes.listed_price &&
//       runes.listed_seller_receive_address &&
//       runes.value
//     ) {
//       const listing = {
//         seller: {
//           makerFeeBp: 100,
//           sellerOrdAddress: runes.address,
//           price: runes.listed_price,
//           ordItem: runes,
//           sellerReceiveAddress: runes.listed_seller_receive_address,
//           signedListingPSBTBase64: runes.signed_psbt,
//           tapInternalKey: runes.tap_internal_key,
//         },
//         buyer: {
//           takerFeeBp: 0,
//           buyerAddress: payerAddress,
//           buyerTokenReceiveAddress: receiverAddress,
//           fee_rate,
//           buyerPublicKey: publickey,
//           unsignedBuyingPSBTBase64: "",
//           buyerDummyUTXOs: [],
//           buyerPaymentUTXOs: paymentUtxos,
//         },
//       };
//       // console.log("Generating payment PSBT");
//       // console.log({ listing });

//       psbt = await generateUnsignedBuyingPSBTBase64(listing, wallet);
//       return {
//         status: "success",
//         message: "has valid utxo",
//         data: {
//           paymentUtxos,
//           payerAddress,
//           psbt,
//           for: "buy",
//         },
//       };
//     } else {
//       if (paymentUtxos) console.log(psbt, "PSBT CREATED");
//       return {
//         status: "success",
//         message: "doesnt have dummy UTXO",
//         data: {
//           paymentUtxos,
//           payerAddress,
//           numberOfDummyUtxosToCreate,
//           dummyUtxos: [],
//           psbt,
//           for: "dummy",
//         },
//       };
//     }
//   } catch (e) {
//     paymentUtxos = undefined;
//     // console.error(e);
//     return Promise.reject(e);
//   }
// }

// async function selectDummyUTXOs(
//   utxos: AddressTxsUtxo[]
// ): Promise<UTXO[] | null> {
//   const result: UTXO[] = [];
//   let counter = 0;

//   for (const utxo of utxos) {
//     if (utxo.value >= 580 && utxo.value <= 1000) {
//       if (await doesUtxoContainRunes(utxo)) {
//         continue;
//       }
//       const mappedUtxo = await mapUtxos([utxo]);
//       result.push(mappedUtxo[0]);
//       counter++;

//       if (counter === 2) {
//         break;
//       }
//     }
//   }

//   return result;
// }

// export async function selectPaymentUtxos(
//   utxos: AddressTxsUtxo[],
//   amount: number, // amount is expected total output (except tx fee)
//   vinsLength: number,
//   voutsLength: number,
//   fee_rate: number,
//   taprootAddress: boolean
// ) {
//   const selectedUtxos: any = [];
//   let selectedAmount = 0;

//   // Sort descending by value, and filter out dummy utxos
//   utxos = utxos
//     .filter((x) => x.value > DUMMY_UTXO_VALUE)
//     .sort((a, b) => b.value - a.value);

//   console.log({ utxos }, "FINAL");

//   for (const utxo of utxos) {
//     // Never spend a utxo that contains an inscription for cardinal purposes

//     if (await doesUtxoContainRunes(utxo)) {
//       console.log("Rune Present in: ", utxo.txid, utxo.vout);
//       continue;
//     }
//     console.log({ utxo });
//     selectedUtxos.push(utxo);
//     console.log(selectedUtxos, "---------------selectedUtxos");
//     selectedAmount += utxo.value;

//     if (
//       selectedAmount >=
//       amount +
//         calculateTxFee(
//           vinsLength + selectedUtxos.length,
//           voutsLength,
//           fee_rate,
//           taprootAddress ? "taproot" : "pwpkh", // Adjust based on actual use

//           taprootAddress ? "taproot" : "pwpkh",
//           1, // Include change output
//           taprootAddress ? "taproot" : "pwpkh" // Change output type
//         )
//     ) {
//       break;
//     }
//   }
//   console.log(selectedAmount, "----selected amount");
//   if (selectedAmount < amount) {
//     console.log(selectedAmount, "----selected amount");
//     throw `Your wallet needs ${Number(
//       await satsToDollars(amount - selectedAmount)
//     ).toFixed(2)} USD more`;
//   }

//   console.log({ selectedUtxos });
//   return selectedUtxos;
// }
// async function generateUnsignedBuyingPSBTBase64(listing: any, wallet: string) {
//   wallet = wallet.toLowerCase();
//   const psbt = new bitcoin.Psbt({
//     network:
//       process.env.NEXT_PUBLIC_NETWORK === "testnet" ? testnet : undefined,
//   });
//   const collection = listing.seller.ordItem.official_collection;
//   const taprootAddress =
//     listing?.buyer?.buyerAddress.startsWith("bc1p") ||
//     listing?.buyer?.buyerAddress.startsWith("tb1p");
//   const segwitAddress =
//     listing?.buyer?.buyerAddress.startsWith("bc1q") ||
//     listing?.buyer?.buyerAddress.startsWith("tb1q");
//   const buyerPublicKey = listing?.buyer?.buyerPublicKey;

//   // const taprootAddress = listing?.buyer?.buyerAddress.startsWith("bc1p");
//   // const segwitAddress = listing?.buyer?.buyerAddress.startsWith("bc1q");
//   // const buyerPublicKey = listing?.buyer?.buyerPublicKey;
//   if (
//     !listing.buyer ||
//     !listing.buyer.buyerAddress ||
//     !listing.buyer.buyerTokenReceiveAddress
//   ) {
//     throw new Error("Buyer address is not set");
//   }
//   if (!listing.seller.ordItem.value) {
//     throw Error("Inscription has no output value");
//   }

//   let totalInput = 0;

//   const { sellerInput, sellerOutput } = await getSellerInputAndOutput(listing);

//   // Add ordinal output
//   psbt.addOutput({
//     address: listing.buyer.buyerTokenReceiveAddress,
//     value: ORDINALS_POSTAGE_VALUE,
//   });

//   const latestBuyerInput = []

//   // Add payment utxo inputs
//   // console.log(listing.buyer, " buyer payment utxos");
//   for (const utxo of listing.buyer.buyerPaymentUTXOs) {
//     const tx = bitcoin.Transaction.fromHex(await getTxHexById(utxo.txid));
//     // console.log(tx, "-------------tx");

//     // Loop through outputs of the transaction
//     for (const output in tx.outs) {
//       try {
//         // Attempt to set an empty witness for each output
//         tx.setWitness(parseInt(output), []);
//       } catch {}
//     }

//     const input: any = {
//       hash: utxo.txid,
//       index: utxo.vout,
//       // Include non-witness UTXO if taprootAddress is defined
//       ...(taprootAddress && {
//         nonWitnessUtxo: tx.toBuffer(),
//       }),
//     };

//     if (!taprootAddress) {
//       // Construct redeem script for P2WPKH (pay-to-witness-public-key-hash)
//       const redeemScript = bitcoin.payments.p2wpkh({
//         pubkey: Buffer.from(listing.buyer.buyerPublicKey!, "hex"),
//       }).output;

//       // Create P2SH (pay-to-script-hash) from redeem script
//       const p2sh = bitcoin.payments.p2sh({
//         redeem: { output: redeemScript },
//       });

//       // Handle different wallets
//       if (wallet !== "unisat") {
//         input.witnessUtxo = tx.outs[utxo.vout];
//         // Set redeem script for specific wallets
//         if (!segwitAddress && (wallet === "xverse" || wallet === "magiceden")) {
//           input.redeemScript = p2sh.redeem?.output;
//         }
//       } else {
//         // Handle unisat wallet inputs
//         input.witnessUtxo = tx.outs[utxo.vout];
//       }
//     } else {
//       // Handle taproot address case
//       input.witnessUtxo = tx.outs[utxo.vout];
//       input.tapInternalKey = toXOnly(
//         tx.toBuffer().constructor(listing.buyer.buyerPublicKey, "hex")
//       );
//     }

//     if(!totalInput){
//     // Add input to PSBT
//     psbt.addInput(input);
//     }
//     else{
//       latestBuyerInput.push(input)
//     }

//     // Accumulate total input value
//     totalInput += utxo.value;
//   }

//   psbt.addInput(sellerInput);
//   psbt.addOutput(sellerOutput);

//   if(latestBuyerInput.length > 0){
//     for(const input of latestBuyerInput){
//       psbt.addInput(input)
//     }
//   }

//   const fee = calculateTxFee(
//     psbt.txInputs.length,
//     psbt.txOutputs.length, // 2-dummy outputs
//     listing.buyer.fee_rate,
//     "pwpkh",
//     taprootAddress ? "taproot" : "pwpkh"
//   );

//   const totalOutput = psbt.txOutputs.reduce(
//     (partialSum, a) => partialSum + a.value,
//     0
//   );

//   const changeValue = totalInput - totalOutput - fee;

//   if (changeValue < 0) {
//     throw `Your wallet needs ${Number(
//       await satsToDollars(-changeValue)
//     ).toFixed(2)} USD more`;
//     throw `Your wallet address doesn't have enough funds to buy this inscription.
// Price:      ${convertSatoshiToBTC(listing.seller.price)} BTC
// Required:   ${convertSatoshiToBTC(totalOutput + fee)} BTC
// Missing:    ${convertSatoshiToBTC(-changeValue)} BTC`;
//   }

//   // Change utxo
//   if (changeValue > DUMMY_UTXO_MIN_VALUE) {
//     psbt.addOutput({
//       address: listing.buyer.buyerAddress,
//       value: changeValue + listing.seller.ordItem.value,
//     });
//   }

//   console.log({ totalInput, totalOutput, fee, changeValue });
//   // console.dir(psbt, { depth: null });

//   listing.buyer.unsignedBuyingPSBTBase64 = psbt.toBase64();
//   listing.buyer.unsignedBuyingPSBTInputSize = psbt.data.inputs.length;
//   return listing;
// }

// async function getSellerInputAndOutput(listing: any) {
//   if (!listing.seller.ordItem.utxo_id) {
//     throw Error("runes has no utxo id");
//   }
//   const [
//     ordinalUtxoTxId,
//     ordinalUtxoVout,
//   ] = listing.seller.ordItem.utxo_id.split(":");
//   const tx = bitcoin.Transaction.fromHex(await getTxHexById(ordinalUtxoTxId));
//   // No need to add this witness if the seller is using taproot
//   if (!listing.seller.tapInternalKey) {
//     for (let outputIndex = 0; outputIndex < tx.outs.length; outputIndex++) {
//       try {
//         tx.setWitness(outputIndex, []);
//       } catch {}
//     }
//   }

//   const sellerInput: any = {
//     hash: ordinalUtxoTxId,
//     index: parseInt(ordinalUtxoVout),
//     nonWitnessUtxo: tx.toBuffer(),
//     // No problem in always adding a witnessUtxo here
//     witnessUtxo: tx.outs[parseInt(ordinalUtxoVout)],
//   };
//   // If taproot is used, we need to add the internal key
//   if (listing.seller.tapInternalKey) {
//     sellerInput.tapInternalKey = toXOnly(
//       tx.toBuffer().constructor(listing.seller.tapInternalKey, "hex")
//     );
//     // console.log(sellerInput.tapInternalKey.toString("hex"), "tik");
//   }
//   if (!listing.seller.ordItem.value) {
//     throw Error("Inscription has no output value");
//   }

//   const ret = {
//     sellerInput,
//     sellerOutput: {
//       address: listing.seller.sellerReceiveAddress,
//       value: getSellerOrdOutputValue(
//         listing.seller.price,
//         listing.seller.makerFeeBp,
//         listing.seller.ordItem.value
//       ),
//     },
//   };

//   return ret;
// }

// export function mergeSignedBuyingPSBTBase64(
//   signedListingPSBTBase64: string,
//   signedBuyingPSBTBase64: string
// ): string {
//   // console.log("[INFO] Initiating merging of signed PSBTs.");

//   // Deserialize PSBTs from Base64
//   // console.log("[INFO] Deserializing seller PSBTs from Base64.");
//   const sellerSignedPsbt = bitcoin.Psbt.fromBase64(signedListingPSBTBase64);

//   // console.log("[INFO] Deserializing buyer PSBTs from Base64.");
//   const buyerSignedPsbt = bitcoin.Psbt.fromBase64(signedBuyingPSBTBase64);

//   // Merge operations
//   // console.log("[INFO] Merging seller's signature into buyer's PSBT.");

//   (buyerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[
//     BUYING_PSBT_SELLER_SIGNATURE_INDEX
//   ] = (sellerSignedPsbt.data.globalMap.unsignedTx as any).tx.ins[0];

//   buyerSignedPsbt.data.inputs[BUYING_PSBT_SELLER_SIGNATURE_INDEX] =
//     sellerSignedPsbt.data.inputs[0];

//   // console.log("[SUCCESS] Merging completed successfully.");

//   // Return serialized PSBT
//   // console.log("[INFO] Serializing merged PSBT to Base64.");
//   return buyerSignedPsbt.toBase64();
// }
