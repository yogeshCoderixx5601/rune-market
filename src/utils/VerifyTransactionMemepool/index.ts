import dbConnect from "@/lib/dbconnect";
import { RuneUtxo } from "@/modals";

export async function verifyInMemepool(txid: string) {
  console.log("VERIFY STATUS IN MEMEPOOL TRUE OR FALSE");
  try {
    await dbConnect();
    // Determine the correct URL based on the network
    const url =
      process.env.NEXT_PUBLIC_NETWORK === "testnet"
        ? `https://mempool.space/testnet/api/tx/0ce5d1f6b546323e6b2fcb9da23be848bc36f5a4b0edd37c6600b8e527dd267e`
        : `https://mempool.space/api/tx/${txid}`;

    // Make a request to the mempool API to check the transaction status
    const response = await fetch(url);
    const data = await response.json();
    console.log(data, "IN MEMEPOOL RESPONSE");

    // If the transaction is confirmed, update the RuneUtxo collection
    if (data.status.confirmed) {
      const outputs = data.vout.map(
        (output: any) => `${output.txid}:${output.n}`
      );
      const listings = true; // Set listings according to your logic

      if (listings) {
        await RuneUtxo.updateMany(
          { utxo_id: { $in: outputs } },
          {
            listed: true,
            in_mempool: true,
            txid,
          }
        );

        console.log("Updated RuneUtxo:", outputs);
      }

      console.log("Transaction successfully broadcasted:", txid);
    } else {
      console.log("Transaction not yet confirmed:", txid);
    }
  } catch (error:any) {
    console.error("Error checking transaction status:", error.message);
  }
}
