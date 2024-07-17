"use server";
import { UtxoData } from "@/types";
// import { IBuyRunes } from "@/types";
import axios from "axios";

interface IResult {
  rune_name:string;
  address:string;
}
interface UserResponse {
  success: boolean;
  message: string;
  result: UtxoData[];
}

export async function getRuneUtxos(
    params: { rune_name: string,listed:boolean }
): Promise<{ data?: UserResponse; error: string | null } | undefined> {
  try {
    let url = `${process.env.NEXT_PUBLIC_URL}/api/v2/rune-utxos`;
    const response = await axios.get(url, {
      params
    });

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
