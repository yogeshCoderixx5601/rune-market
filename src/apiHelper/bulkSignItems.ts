"use server";
import axios from "axios";

interface OrderResponse {
  ok: boolean;
  utxo_id: string;
  price: number;
  message: string;
}

interface UserResponse {
  success: boolean;
  message: string;
  result: OrderResponse;
}
interface ListData {
  items: any;
}

export async function signBulkItems(
  listData: ListData
): Promise<{ data?: UserResponse; error: string | null } | undefined> {
  try {
    // console.log(listData, "------------helper wallet");
    let url = `${process.env.NEXT_PUBLIC_URL}/api/bulk-sign`;
    const response = await axios.post(url, {
      //here we can optimise the code by removing params send directly data inside list item
      params: {
        listData,
      },
    });
    // console.log(response, "--------response helper");

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
