"use server";
import { IUser } from "@/types";
import axios from "axios";

interface RunesResponse {
  success: boolean;
  message: string;
}

export async function addRunes(
  walletDetails: any
): Promise<{ data?: RunesResponse; error: string | null } | undefined> {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/api/get-utxos`,
      walletDetails
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
