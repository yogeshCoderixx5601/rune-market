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

interface BuyRunesParams {
  utxo_id: string;
  publickey: string | undefined;
  pay_address: string | undefined;
  receive_address: string | undefined;
  wallet: any; // Adjust type as per your application's needs
  fee_rate: number;
  price: number;
}

export async function buyRunes(
  params: BuyRunesParams
): Promise<{ data?: BuyRunesResponse; error: string | null } | undefined> {
  try {
    // console.log([params, "-------BuyRunesParams"])
    let url = `${process.env.NEXT_PUBLIC_URL}/api/order/create-buying-psbt`;
    const response = await axios.post(url, {
      utxo_id: params.utxo_id,
      publickey: params.publickey,
      pay_address: params.pay_address,
      receive_address: params.receive_address,
      wallet: params.wallet,
      fee_rate: params.fee_rate,
      price: params.price,
    });

    // console.log(response, "--------response"); // Check response structure

    if (response.status === 200) {
      return { data: response.data, error: null };
    } else {
      return { error: `Request failed with status code: ${response.status}` };
    }
  } catch (error: any) {
    console.error("Error in buyRunes:", error);
    return { error: error?.message || "An unknown error occurred" };
  }
}

