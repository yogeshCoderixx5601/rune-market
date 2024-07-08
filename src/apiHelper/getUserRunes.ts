"use server";
import { IUser } from "@/types";
import axios from "axios";

interface UserResponse {
  success: boolean;
  message: string;
  result: any;
}

export async function getRuneUtxos(
  ordinal_address: string
): Promise<{ data?: UserResponse; error: string | null } | undefined> {
  try {

    let url = `${process.env.NEXT_PUBLIC_URL}/api/dashboard`;
    const response = await axios.get(url,{
      params:{
        ordinal_address
      }
    })

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

