"use server";
import axios from "axios";

interface IResult {
  unsigned_psbt_base64: string;
  input_length: number;
  utxo_id: string;
  receive_address: string;
  pay_address: string;
  for: string; // Assuming 'for' is a string, adjust if it's a different type
}

interface BuyRunesResponse {
  ok: boolean;
  result: IResult;
}

interface RuneData {
  utxo_id: string;
  publickey: string | undefined;
  pay_address: string | undefined;
  receive_address: string | undefined;
  wallet: any; // Adjust type as per your application's needs
  fee_rate: number;
  price: number;
}

export async function bulkbuyRunes(
  body: any
): Promise<{ data?: BuyRunesResponse; error: string | null } | undefined> {
  try {
    let url = `${process.env.NEXT_PUBLIC_URL}/api/bulk-buy-create-psbt`;
    const response = await axios.post(url, {
      publickey: body.publickey,
      pay_address: body.pay_address,
      receive_address: body.receive_address,
      wallet: body.wallet,
      fee_rate: body.fee_rate,
      runes: body.runes
    });

    if (response.status === 200) {
      return { data: response.data, error: null };
    } else {
      return { error: `Request failed with status code: ${response.status}` };
    }
  } catch (error: any) {
    console.error("Error in bulkbuyRunes:", error);
    return { error: error?.message || "An unknown error occurred" };
  }
}
