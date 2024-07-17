"use client";

import { RootState } from "@/stores";
import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useWalletAddress, useSignTx } from "bitcoin-wallet-adapter";
import { getUtxos } from "@/apiHelper/getUtxos";
import { bulkListing } from "@/apiHelper/bulkListing";
import { signBulkItems } from "@/apiHelper/bulkSignItems";
import { UtxoData } from "@/types";

interface RunesResponse {
  success: boolean;
  utxo_id: string;
  price: number;
  receive_address: string;
  unsigned_psbt_base64: string;
  tap_internal_key?: string;
  message: "Success";
}

// interface UtxoWithAmount {
//   utxo: any;
//   inputAmount: number;
// }

const RuneUtxos = ({ rune_name }: { rune_name: string }) => {
  console.log(rune_name, "rune i get");
  const [utxos, setUtxos] = useState<UtxoData[]>([]);
  const [inputValues, setInputValues] = useState<{ [key: number]: number }>({});
  const [totals, setTotals] = useState<{ [key: number]: number }>({});
  const [prices, setPrices] = useState<{ [key: number]: number }>({});
  const { loading: signLoading, result, error, signTx: sign } = useSignTx();
  const [unsignedPsbtBase64, setUnsignedPsbtBase64] = useState<string>("");
  const [action, setAction] = useState<string>("dummy");
  const [loading, setLoading] = useState(false);
  const [listItem, setlistitems] = useState<RunesResponse | null>(null);
  const [signPsbt, setSignPsbt] = useState("");
  const [items, setItems] = useState<any>({});
  const walletDetails = useWalletAddress();

  const getRuneUtxosData = async () => {
    try {
      // const encodedRune = encodeURIComponent(rune);
      if (
        walletDetails &&
        walletDetails.connected &&
        walletDetails.ordinal_address
      ) {
        const params = {
          address: walletDetails.ordinal_address,
          rune_name: rune_name,
        };
        const response = await getUtxos(params);
        const utxos = response?.data?.result;
        console.log(utxos, "addressbased utxos");
        if (utxos) {
          setUtxos(utxos);
        }
      }
    } catch (error) {
      console.log("Error fetching rune UTXOs:", error);
    }
  };
  useEffect(() => {
    getRuneUtxosData();
  }, []);

  // console.log(utxos,"------------get utxos")

  const BtcPrice = useSelector(
    (state: RootState) => state.general.btc_price_in_dollar
  );

  const calculateTotal = (
    inputValue: number,
    amount: number,
    divisibility: number,
    utxoIndex: number
  ) => {
    if (isNaN(inputValue)) {
      return 0;
    }

    const totalAmount = amount / Math.pow(10, divisibility);
    const total = inputValue * totalAmount;
    setPrices((prev) => ({ ...prev, [utxoIndex]: total }));
    return total / 100000000;
  };

  const handleInput = (
    event: React.ChangeEvent<HTMLInputElement>,
    utxoIndex: number
  ) => {
    const value = Number(event.target.value);
    setInputValues((prev) => ({ ...prev, [utxoIndex]: value }));
    console.log(value, "--------------value");
    const totalValue = calculateTotal(
      value,
      utxos[utxoIndex]?.rune_amount,
      utxos[utxoIndex]?.rune_divisibility,
      utxoIndex
    );
    console.log(totalValue, "------------total value");
    setTotals((prev) => ({ ...prev, [utxoIndex]: totalValue }));
  };

  const listItemData = async (details: any) => {
    console.log(details, "-----utxo");
    const response = await bulkListing(details);
    console.log(response, "---------------response bulkListing");
    if (response?.data) {
      setUnsignedPsbtBase64(response.data.unsigned_psbt_base64);
      setlistitems(response?.data);
    }
  };

  const handleListAll = async () => {
    const itemsDetailsArray = utxos.map((utxo, utxoIndex) => ({
      price: prices[utxoIndex],
      utxo_id: utxo?.utxo_id,
    }));

    const body = {
      receiveAddress: walletDetails?.ordinal_address,
      wallet: walletDetails?.wallet,
      publickey: walletDetails?.ordinal_pubkey,
      items: itemsDetailsArray,
    };
    setItems(body);
    await listItemData(body);
  };

  const signTx = useCallback(async () => {
    if (!walletDetails) {
      alert("Connect wallet to proceed");
      return;
    }
    let inputs:any= [];
    Object.entries(inputValues).map((_, idx) => {
      inputs.push({
        address: walletDetails.ordinal_address,
        publickey: walletDetails.ordinal_pubkey,
        sighash: 131,
        index: [idx],
      });
    });
    // inputs.push({
    //   address: walletDetails.ordinal_address,
    //   publickey: walletDetails.ordinal_pubkey,
    //   sighash: 131,
    //   index: [0],
    // });

    const options: any = {
      psbt: unsignedPsbtBase64,
      network: process.env.NEXT_PUBLIC_NETWORK || "Mainnet",
      action: "sell",
      inputs,
    };
    console.log(options, "OPTIONS");

    await sign(options);
  }, [action, unsignedPsbtBase64]);

  useEffect(() => {
    if (result) {
      console.log("Sign Result:", result);
      setSignPsbt(result);
    }

    if (error) {
      console.error("Sign Error:", error);
      alert("Wallet error occurred");
      setLoading(false);
    }

    setLoading(false);
  }, [result, error]);
  console.log(items, "-------------set items");

  const sendSignedPsbtAndListItems = async (
    signedPsbt: string,
    listItem: RunesResponse | null
  ) => {
    if (!signedPsbt || !listItem) return;
    const listData = {
      ...items,
      unsigned_listing_psbt_base64: listItem.unsigned_psbt_base64,
      tap_internal_key: listItem.tap_internal_key,
      signed_listing_psbt_base64: signedPsbt,
    };
    console.log(listData, "---list data");
    const response = await signBulkItems(listData);
    console.log("Response from list item:", response);

    try {
    } catch (error) {
      console.error("Error sending data to API endpoint:", error);
    }
  };

  useEffect(() => {
    sendSignedPsbtAndListItems(signPsbt, listItem);
  }, [signPsbt]);

  console.log(prices, totals,"---hhhh")

  return (
    <div className="w-full flex flex-col gap-4 p-4 bg-gray-50 rounded-lg shadow-lg">
      {utxos?.map((utxo, utxoIndex) => (
        <div className="w-full flex flex-col" key={utxoIndex}>
          <div className="w-full border-b-2 py-4 flex flex-wrap items-center justify-between bg-white p-4 rounded-lg shadow-md">
            <div className="w-1/4 flex flex-col items-start">
              <p className="text-sm font-semibold text-gray-700">Rune Name</p>
              <p className="text-lg text-left text-gray-900">
                {utxo.rune_name}
              </p>
              <p className="text-sm font-semibold text-gray-700 mt-2">Amount</p>
              <p className="text-lg text-gray-900">
                {utxo.rune_amount / Math.pow(10, utxo.rune_divisibility)}
              </p>
            </div>
            <div className="w-1/4 flex flex-col justify-between items-start px-4">
              <p className="text-sm font-semibold text-gray-700">
                Value in BTC
              </p>
              <p className="text-lg text-gray-900">
                {totals[utxoIndex] || ""} BTC
              </p>
              <p className="text-sm font-semibold text-gray-700 mt-2">
                Value in USD
              </p>
              <p className="text-lg text-gray-900">
                {((totals[utxoIndex] || 0) * BtcPrice).toFixed(2)} USD
              </p>
            </div>
            <div className="w-1/4 flex flex-col items-start px-4">
              <p className="text-sm font-semibold text-gray-700">
                Input Amount
              </p>
              <input
                type="text"
                onChange={(e) => handleInput(e, utxoIndex)}
                value={inputValues[utxoIndex] || ""}
                className="w-full border border-customPurple_900 bg-transparent rounded outline-none px-3 py-2 mt-1 text-black"
              />
            </div>
          </div>
        </div>
      ))}
      <div className="w-full flex justify-center mt-4">
        {!unsignedPsbtBase64 ? (
          <div className="">
            <button
              onClick={handleListAll}
              className="custom-gradient text-white font-bold py-2 px-4 rounded cursor-pointer"
            >
              List All
            </button>
          </div>
        ) : (
          <button
            onClick={signTx}
            className="custom-gradient text-white font-bold py-2 px-4 rounded cursor-pointer"
          >
            Sign All
          </button>
        )}
      </div>
    </div>
  );
};

export default RuneUtxos;




// "use client";
// import { RootState } from "@/stores";
// import React, { useCallback, useEffect, useState } from "react";
// import { useSelector } from "react-redux";
// import { useWalletAddress, useSignTx } from "bitcoin-wallet-adapter";
// import { getUtxos } from "@/apiHelper/getUtxos";
// import { listItems } from "@/apiHelper/listItems";
// import { signItems } from "@/apiHelper/signItems";

// interface RunesResponse {
//   success: boolean;
//   utxo_id: string;
//   price: number;
//   receive_address: string;
//   unsigned_psbt_base64: string;
//   tap_internal_key?: string;
//   message: "Success";
// }

// interface UtxoWithAmount {
//   utxo: any;
//   inputAmount: number;
// }

// const RuneUtxos = ({ rune }: { rune: string }) => {
//   console.log(rune, "rune i get");
//   const [utxos, setUtxos] = useState<any[]>([]);
//   const [inputValues, setInputValues] = useState<{ [key: number]: number }>({});
//   const [totals, setTotals] = useState<{ [key: number]: number }>({});
//   const [prices, setPrices] = useState<{ [key: number]: number }>({});
//   const { loading: signLoading, result, error, signTx: sign } = useSignTx();
//   const [unsignedPsbtBase64, setUnsignedPsbtBase64] = useState<string>("");
//   const [action, setAction] = useState<string>("dummy");
//   const [loading, setLoading] = useState(false);
//   const [listItem, setlistitems] = useState<RunesResponse | null>(null);
//   const [signPsbt, setSignPsbt] = useState("");
//   const walletDetails = useWalletAddress();

//   const getRuneUtxosData = async () => {
//     try {
//       const encodedRune = encodeURIComponent(rune);
//       const response = await getUtxos(encodedRune);
//       console.log(response?.data?.result, "response getUtxos");
//       const utxos = response?.data?.result;
//       if (utxos) {
//         setUtxos(utxos);
//       }
//     } catch (error) {
//       console.log("Error fetching rune UTXOs:", error);
//     }
//   };
//   useEffect(() => {
//     getRuneUtxosData();
//   }, []);

//   const BtcPrice = useSelector(
//     (state: RootState) => state.general.btc_price_in_dollar
//   );

//   const calculateTotal = (
//     inputValue: number,
//     amount: number,
//     divisibility: number,
//     utxoIndex: number
//   ) => {
//     if (isNaN(inputValue)) {
//       return 0;
//     }

//     const totalAmount = amount / Math.pow(10, divisibility);
//     console.log(totalAmount, "-------------totalAmount");
//     const total = inputValue * totalAmount;
//     setPrices((prev) => ({ ...prev, [utxoIndex]: total }));
//     return total / 100000000;
//   };

//   const handleInput = (
//     event: React.ChangeEvent<HTMLInputElement>,
//     utxoIndex: number
//   ) => {
//     const value = Number(event.target.value);
//     console.log(value, "----------value");
//     setInputValues((prev) => ({ ...prev, [utxoIndex]: value }));
//     const totalValue = calculateTotal(
//       value,
//       utxos[utxoIndex]?.rune_amount,
//       utxos[utxoIndex]?.rune_divisibility,
//       utxoIndex
//     );
//     setTotals((prev) => ({ ...prev, [utxoIndex]: totalValue }));
//   };

//   const listItemData = async (utxo: any, utxoIndex: number) => {
//     const details = {
//       utxo_id: utxo?.utxo_id,
//       receive_address: utxo?.address,
//       price: prices[utxoIndex],
//       wallet: walletDetails?.wallet,
//       publickey: walletDetails?.ordinal_pubkey,
//     };
//     // console.log("Listing PSBT with details:", details);
//     const response = await listItems(details);
//     // console.log("API Response:", response);

//     if (response?.data) {
//       setUnsignedPsbtBase64(response.data.unsigned_psbt_base64);
//       setlistitems(response?.data);
//     }
//   };

//   const handleList = (utxoIndex: number) => {
//     const utxo = utxos[utxoIndex];
//     listItemData(utxo, utxoIndex);
//   };

//   const signTx = useCallback(async () => {
//     if (!walletDetails) {
//       alert("connet wallet to procced");
//       return;
//     }
//     let inputs = [];
//     inputs.push({
//       address: walletDetails.ordinal_address,
//       publickey: walletDetails.ordinal_pubkey,
//       sighash: 131,
//       index: [0],
//     });

//     const options: any = {
//       psbt: unsignedPsbtBase64,
//       network: process.env.NEXT_PUBLIC_NETWORK || "Mainnet",
//       action: "sell",
//       inputs,
//     };
//     console.log(options, "OPTIONS");

//     await sign(options);
//   }, [action, unsignedPsbtBase64]);

//   useEffect(() => {
//     // Handling Wallet Sign Results/Errors
//     if (result) {
//       // Handle successful result from wallet sign
//       console.log("Sign Result:", result);
//       setSignPsbt(result);
//     }

//     if (error) {
//       console.error("Sign Error:", error);

//       alert("Wallet error occurred");

//       setLoading(false);
//       // Additional logic here
//     }

//     // Turn off loading after handling results or errors
//     setLoading(false);
//   }, [result, error]);

//   console.log(unsignedPsbtBase64, "------------unsignedPsbtBase64");

//   const sendSignedPsbtAndListItems = async (
//     signedPsbt: string,
//     listItem: RunesResponse | null
//   ) => {
//     if (!signedPsbt || !listItem) return;
//     const listData = {
//       seller_receive_address: listItem.receive_address,
//       price: listItem.price,
//       utxo_id: listItem.utxo_id,
//       unsigned_listing_psbt_base64: listItem.unsigned_psbt_base64,
//       tap_internal_key: listItem.tap_internal_key,
//       signed_listing_psbt_base64: signedPsbt,
//     };
//     console.log(listData, "---list data");
//     const response = await signItems(listData);
//     console.log("Response from list item:", response);

//     try {
//     } catch (error) {
//       console.error("Error sending data to API endpoint:", error);
//     }
//   };

//   useEffect(() => {
//     sendSignedPsbtAndListItems(signPsbt, listItem);
//   }, [signPsbt]);

//   return (
//     <div className="w-full flex flex-col gap-4 p-4 bg-gray-50 rounded-lg shadow-lg">
//       {utxos?.map((utxo, utxoIndex) => (
//         <div className="w-full flex flex-col">
//           <div
//             key={utxoIndex}
//             className="w-full border-b-2 py-4 flex flex-wrap items-center justify-between bg-white p-4 rounded-lg shadow-md"
//           >
//             <div className="w-1/4 flex flex-col items-start">
//               <p className="text-sm font-semibold text-gray-700">Rune Name</p>
//               <p className="text-lg text-left text-gray-900">
//                 {utxo.rune_name}
//               </p>
//               <p className="text-sm font-semibold text-gray-700 mt-2">Amount</p>
//               <p className="text-lg text-gray-900">
//                 {utxo.rune_amount / Math.pow(10, utxo.rune_divisibility)}
//               </p>
//             </div>
//             <div className="w-1/4 flex flex-col justify-between items-start px-4">
//               <p className="text-sm font-semibold text-gray-700">
//                 Value in BTC
//               </p>
//               <p className="text-lg text-gray-900">
//                 {totals[utxoIndex] || ""} BTC
//               </p>
//               <p className="text-sm font-semibold text-gray-700 mt-2">
//                 Value in USD
//               </p>
//               <p className="text-lg text-gray-900">
//                 {((totals[utxoIndex] || 0) * BtcPrice).toFixed(2)} USD
//               </p>
//             </div>
//             <div className="w-1/4 flex flex-col items-start px-4">
//               <p className="text-sm font-semibold text-gray-700">
//                 Input Amount
//               </p>
//               <input
//                 type="text"
//                 onChange={(e) => handleInput(e, utxoIndex)}
//                 value={inputValues[utxoIndex] || ""}
//                 className="w-full border border-customPurple_900 bg-transparent rounded outline-none px-3 py-2 mt-1 text-black"
//               />
//             </div>
//           </div>
//           <div className="flex">
//             {!unsignedPsbtBase64 ? (
//               <div className="w-1/4 flex justify-center mt-4">
//                 {!utxo.listed ? (
//                   <button
//                     onClick={() => handleList(utxoIndex)}
//                     className="custom-gradient text-white font-bold py-2 px-4 rounded cursor-pointer flex justify-center"
//                   >
//                     List Now
//                   </button>
//                 ) : (
//                   <button className="custom-gradient text-white font-bold py-2 px-4 rounded cursor-pointer flex justify-center">
//                     Listed
//                   </button>
//                 )}
//               </div>
//             ) : (
//               <div className="w-1/4 flex justify-center mt-4">
//                 <button
//                   onClick={signTx}
//                   className="custom-gradient text-white font-bold py-2 px-4 rounded cursor-pointer flex justify-center"
//                 >
//                   Sign Now
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default RuneUtxos;
