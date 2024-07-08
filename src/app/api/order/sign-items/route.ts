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

interface OrderInput {
  seller_receive_address: string;
  price: number; //in sats
  utxo_id: string;
  maker_fee_bp?: number;
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
  seller_receive_address: string;
  price: number;
  tap_internal_key: string;
  unsigned_listing_psbt_base64: string;
}

export async function POST(req: NextRequest) {
  console.log("***** LIST ITEM API CALLED *****");

  const itemData = await req.json();
  const orderInput = itemData.params.listData;
  console.log(orderInput, "--------------order items");
  // Ensure orderInput contains all necessary fields
  const requiredFields = [
    "seller_receive_address",
    "price",
    "utxo_id",
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
    if (
      orderInput.seller_receive_address &&
      orderInput.utxo_id &&
      orderInput.price
    ) {
      //   console.log("adding final script witness");

      const psbt = addFinalScriptWitness(orderInput.signed_listing_psbt_base64);
      if (
        orderInput.seller_receive_address.startsWith("bc1p") ||
        orderInput.seller_receive_address.startsWith("tb1p")
      ) {
        const validSig = verifySignature(psbt);
        if (!validSig) {
          return NextResponse.json(
            {
              ok: false,
              utxo_id: orderInput.utxo_id,
              price: orderInput.price,
              message: "Invalid signature",
            },
            { status: 500 }
          );
        }
      }
        console.log("------------------------------psbt in list items:", psbt);

      const runeUtxo = await RuneUtxo.findOne({
        utxo_id: orderInput.utxo_id,
      });

      if (runeUtxo) {
        let listed_price_per_token = 0;
        let totalRunes =
          runeUtxo.rune_amount /
          Math.pow(10, runeUtxo.rune_divisibility);
        console.log(totalRunes, "-----------totalRunes");
        if (runeUtxo && runeUtxo.length > 0) {
          listed_price_per_token = totalRunes / orderInput.price;
        }
        runeUtxo.listed = true;
        runeUtxo.listed_at = new Date();
        runeUtxo.listed_price = orderInput.price;
        runeUtxo.listed_price_per_token = listed_price_per_token;
        runeUtxo.listed_seller_receive_address =
          orderInput.seller_receive_address;
        runeUtxo.signed_psbt = psbt;
        runeUtxo.unsigned_psbt = orderInput.unsigned_listing_psbt_base64;
        runeUtxo.listed_maker_fee_bp = orderInput.maker_fee_bp || 100;
        //updating utxo collection with these details
        await runeUtxo.save();
        // console.log(runeUtxo, "----------rune runesData");

        let docObject = runeUtxo.toObject();
        delete docObject.__v; // remove version key
        delete docObject._id; // remove _id if you don't need it
        console.log("Updated listing");

        // const user = await User.findOne({
        //   ordinal_address: runeUtxo.address,
        // });

        // let btcPrice = 0;

        // const btc_cache_key = "bitcoinPrice";
        // // const cache = await getCache(btc_cache_key);
        // // if (cache) btcPrice = cache;
        // // else {
        //   btcPrice = (await getBTCPriceInDollars()) || 0;
        // //   await setCache(btc_cache_key, btcPrice, 120);
        // // }
        // console.log({ btcPrice });
      }

      // use orderInput object here
      return NextResponse.json({
        ok: true,
        result: { utxo_id: orderInput.utxo_id, price: orderInput.price },
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
