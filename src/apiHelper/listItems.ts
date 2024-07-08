"use server";
import axios from "axios";

interface RunesResponse {
  success: boolean;
  utxo_id: string;
  price: number;
  receive_address: string;
  unsigned_psbt_base64: string;
  tap_internal_key?: string;
  message: "Success";
}
export interface ListPsbt {
  utxo_id: string ;
  receive_address: string ;
  price: number ;
  wallet: any ;
  publickey?: string ;
}


export async function listItems(
  params: ListPsbt
): Promise<{ data?: RunesResponse; error: string | null } | undefined> {
  try {
    console.log(params, "-------------params");
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/api/order/list-items`,
      params
    );

    if (response.status === 200) {
      return { data: response.data, error: null };
    } else {
      // You might want to customize this message or extract more specific info from the response
      return { error: `Request failed with status code: ${response.status}` };
    }
  } catch (error:any) {
    // Assuming error is of type any. You might want to add more specific type handling
    return { error: error?.message || "An unknown error occurred" };
  }
}
