import { NextRequest, NextResponse } from "next/server";
import * as bitcoin from "bitcoinjs-lib";
import secp256k1 from "@bitcoinerlab/secp256k1";
// import { getCache, setCache } from "@/lib/cache";
import { getBTCPriceInDollars } from "@/utils";
import { mergeSignedBuyingPSBTBase64 } from "@/utils/MarketPlace/buying";
import { fromXOnly } from "@/utils/MarketPlace";
import { RuneUtxo, User } from "@/modals";
export async function POST(
  req: NextRequest,
  res: NextResponse<{
    ok: boolean;
    message?: string;
    data?: string;
    error?: string;
  }>
) {
  bitcoin.initEccLib(secp256k1);
  console.log("***** BROADCAST API CALLED *****");

  const { signed_psbt, activity_tag, user_address } = await req.json();
  console.log(
    signed_psbt,
    activity_tag,
    user_address,
    "--------------------inside broadcast i get"
  );
  if (!signed_psbt.trim()) {
    return NextResponse.json(
      {
        ok: false,
        message: "signed_psbt is required",
        error: "signed_psbt is required",
      },
      { status: 400 }
    );
  }

  try {
    console.debug(signed_psbt, "signed_psbt");
    // Parse and finalize the PSBT
    let parsedPsbt = bitcoin.Psbt.fromBase64(signed_psbt);

    let doc: any = null;

    console.log({parsedPsbt: parsedPsbt.data.inputs[1]})

    if (
      parsedPsbt.data.inputs[1].nonWitnessUtxo
    ) {
      let sellerPublicKey: string | null = null;
      if (parsedPsbt.data.inputs[1].tapInternalKey)
        sellerPublicKey = fromXOnly(parsedPsbt.data.inputs[1].tapInternalKey);
      const inscriptionNWO = parsedPsbt.data.inputs[1].nonWitnessUtxo;
      const deserializedTx = bitcoin.Transaction.fromBuffer(inscriptionNWO);
      const txid = deserializedTx.getId();
      const outputs = deserializedTx.outs.map((item, idx) => {
        return `${txid}:${idx}`;
      });

      console.log({outputs})

      // Query the ListingModel
      const listings = await RuneUtxo.find({
        listed: true,
        utxo_id: { $in: outputs },
      });

      doc = listings[0];

      if (!doc)
        return NextResponse.json(
          {
            ok: false,
            message: "This rune is not listed on our site",
          },
          { status: 404 }
        );

        console.log("merging...")
      const mergedPsbtBase64 = mergeSignedBuyingPSBTBase64(
        doc.signed_psbt,
        signed_psbt
      );

      console.debug(mergedPsbtBase64, "Merged PSBT");

      parsedPsbt = bitcoin.Psbt.fromBase64(mergedPsbtBase64);
    }

    for (let i = 0; i < parsedPsbt.data.inputs.length; i++) {
      try {
        parsedPsbt.finalizeInput(i);
      } catch (e) {
        console.error(`Error finalizing input at index ${i}: ${e}`);
      }
    }

    const txHex = parsedPsbt.extractTransaction().toHex();
    console.log(txHex, "TXHEX");

    const url =
      process.env.NEXT_PUBLIC_NETWORK === "testnet"
        ? `https://mempool.space/testnet/api/tx`
        : `https://mempool-api.ordinalnovus.com/tx`;
    // return;
    // Broadcast the finalized transaction
    const broadcastRes = await fetch(url, {
      method: "post",
      body: txHex,
    });

    if (broadcastRes.status != 200) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "error broadcasting tx " +
            broadcastRes.statusText +
            "\n\n" +
            (await broadcastRes.text()),
        },
        { status: 400 }
      );
    }

    const txid = await broadcastRes.text();
    console.log(txid, "BROADCAST RESULT");

    const user = await User.findOne({
      cardinal_address: user_address,
    });
    console.log({ user });
    console.log(doc,"-----------------------docs before update false")
    if (txid) {
      if (doc) {
        await RuneUtxo.findByIdAndUpdate(doc._id, {
          listed: false,
          // in_mempool: true,
          txid,
        });

        console.log(RuneUtxo, "updated runes utxo");
        // let btcPrice = 0;

        // const btc_cache_key = "bitcoinPrice";
        // const cache = await getCache(btc_cache_key);
        // if (cache) btcPrice = cache;
        // else {
        //   btcPrice = (await getBTCPriceInDollars()) || 0;
        //   await setCache(btc_cache_key, btcPrice, 120);
        // }
        // console.log({ btcPrice });

        // if (user) {
        //   console.log("creating activity");
        //   createActivity({
        //     inscription_id: doc.inscription_id,
        //     inscription: doc._id,
        //     type: "buy",
        //     user: user._id,
        //     seller: doc.address,
        //     buyer: user_address,
        //     price_usd: (doc.listed_price / 100_000_000) * btcPrice,
        //     price_sat: doc.listed_price,
        //     txid,
        //   });
        // }
      }

      //   if (activity_tag === "prepare") {
      //     // createActivity({
      //     //   type: "prepare",
      //     //   user: user._id,
      //     //   txid,
      //     // });
      //   }
      return NextResponse.json({
        ok: true,
        message: "Transaction successfully broadcasted",
        data: { txid },
      });
    }
  } catch (error:any) {
    console.error(`Error in handler function: ${error}`);
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to broadcast the transaction",
        error: error.message || error,
      },
      { status: 500 }
    );
  }
}
