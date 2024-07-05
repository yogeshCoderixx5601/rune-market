// set runes in [runes] based on the ordinal address in user collection
import dbConnect from "@/lib/dbconnect";
import { RuneUtxo, User } from "@/modals";
import { aggregateRuneAmounts, getRunes } from "@/utils/GetRunes";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("************post runes to db for user and store utxos api called *************")
  try {
    const walletDetails = await req.json();
    console.log(walletDetails, "wallet details");

    const runesUtxos = await getRunes(walletDetails.ordinal_address);

    const aggregateRuneAmount = aggregateRuneAmounts(runesUtxos);

    await dbConnect();

    const runes = aggregateRuneAmount.map((rune: { name: any; amount: any; }) => ({
      name: rune.name,
      amount: rune.amount,
    }));
    // console.log(runes,"----------runes")

    // const address = walletDetails.ordinal_address;

    for (const rune of runes) {
      const query = {
        ordinal_address: walletDetails.ordinal_address,
        "runes.name": { $ne: rune.name },
      };
      const update = { $addToSet: { runes: rune } };

      // updating user with runes
      const result = await User.findOneAndUpdate(query, update, {
        new: true,
        useFindAndModify: false,
      });

      if (result) {
        // `Rune ${rune.name} already exists, no update performed`
        console.log(`Rune updated successfully`);
      } else {
        console.log(`Rune ${rune.name} already exists, no update performed`);
        // throw new Error(`Rune ${rune.name} already exists, no update performed`)
      }
    }

    const transformedUtxos = runesUtxos.map((utxo: any) => {
      const runes: any[] = Object.entries(utxo.rune || {}).map(
        ([key, value]) => {
          // Explicitly type the value
          const runeValue = value as {
            name: string;
            amount: number;
            divisibility: number;
            symbol: string;
          };
          return {
            rune_name: key,
          rune_amount: runeValue.amount,
          rune_divisibility: runeValue.divisibility,
          rune_symbol: runeValue.symbol,
          };
        }
      );
      console.log(runes,"runes")
      const { rune, ...rest } = utxo;

      // Assuming there is only one rune in each utxo.rune object
      const [firstRune] = runes;
  
      return {
        ...rest,
        ...firstRune,
      };
    });
    console.log(transformedUtxos, "------transformedUtxos");

// create new doc in utxoModal
const utxos = await RuneUtxo.create(transformedUtxos);
    console.log("Runes UTXOs saved successfully", utxos);

    return NextResponse.json({
      success:true,
      message: "Data received and processed successfully.",
      // utxos: utxos,
    });
  } catch (error) {
    console.error("Error :", error);
    return NextResponse.json({ error: "Error " }, { status: 500 });
  }
}