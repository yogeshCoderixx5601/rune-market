"use client";
import { RootState } from "@/stores";
import { addNotification } from "@/stores/reducers/notificationReducer";
import { convertSatoshiToBTC, convertSatoshiToUSD } from "@/utils";
import { useWalletAddress, useSignTx } from "bitcoin-wallet-adapter";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import axios from "axios";
import { setNewActivity } from "@/stores/reducers/generalReducer";
import { IBuyRunes } from "@/types";
import mempoolJS from "@mempool/mempool.js";
import { buyRunes } from "@/apiHelper/buyRunes";
import { getBuyRune } from "@/apiHelper/getBuyRunes";
import { bulkbuyRunes } from "@/apiHelper/bulkBuyRunes";

interface Props {
  runes: IBuyRunes[];
}

const BuyRunePage = () => {
  const walletDetails = useWalletAddress();
  const dispatch = useDispatch();
  const router = useRouter();
  const [action, setAction] = useState<string>("");
  const [runeData, setRuneData] = useState<any>({});
  const [unsignedPsbtBase64, setUnsignedPsbtBase64] = useState<string>("");
  const [inputLength, setInputLength] = useState(0);
  const { loading: signLoading, result, error, signTx: sign } = useSignTx();
  const [loadingMap, setLoadingMap] = useState<{ [key: string]: boolean }>({});
  const [errorMap, setErrorMap] = useState<{ [key: string]: string | null }>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [feeRate, setFeeRate] = useState(0);
  const [runes, setRunes] = useState<any[]>([]);
  const [selectedRunes, setSelectedRunes] = useState<IBuyRunes[]>([]);
  const BtcPrice = useSelector(
    (state: RootState) => state.general.btc_price_in_dollar
  );
  const balanceData = useSelector(
    (state: RootState) => state.general.balanceData
  );

  const Runesutxo = async () => {
    try {
      const response = await getBuyRune();
      console.log(response?.data?.result, "-----------------response");
      const runes = response?.data?.result;
      if (runes) {
        console.log(runes, "-----------------response");
        setRunes(runes); // Update state only if runes is defined
      } else {
        console.log("No data received from API");
      }
    } catch (error) {}
  };
  console.log(runes, "-------runes");

  useEffect(() => {
    Runesutxo();
  }, []);

  const fee = async () => {
    const {
      bitcoin: { fees },
    } = mempoolJS({
      hostname: "mempool.space",
      network: "testnet",
    });
    const feesRecommended = await fees.getFeesRecommended();
    setFeeRate(feesRecommended.fastestFee + 10);
    console.log(feesRecommended);
  };

  useEffect(() => {
    fee();
  }, []);

  console.log(feeRate, "-----fee rate");

  console.log(unsignedPsbtBase64, "---------------unsignedPsbtBase64");

  const handleBuyRunes = async (rune: IBuyRunes) => {
    console.log(rune, "----------rune buy ");
    setLoadingMap((prevLoadingMap) => ({
      ...prevLoadingMap,
      [rune._id]: true,
    }));
    setErrorMap((prevErrorMap) => ({
      ...prevErrorMap,
      [rune._id]: null,
    }));
    const runeData = rune;
    console.log(runeData, "---------rune data");
    setRuneData(runeData);

    try {
      const response = await buyRunes({
        utxo_id: rune.utxo_id,
        publickey: walletDetails?.cardinal_pubkey,
        pay_address: walletDetails?.cardinal_address,
        receive_address: walletDetails?.ordinal_address,
        wallet: walletDetails?.wallet,
        fee_rate: feeRate,
        price: rune.listed_price,
      });
      if (response?.data?.result) {
        console.log(
          response?.data?.result.unsigned_psbt_base64,
          "----------------response buy button"
        );
        setAction("buy");
        setInputLength(response?.data?.result.input_length);
        setUnsignedPsbtBase64(
          response?.data?.result.unsigned_psbt_base64 || ""
        );
      }
    } catch (error:any) {
      setErrorMap((prevErrorMap) => ({
        ...prevErrorMap,
        [rune._id]: error.message || "An error occurred",
      }));
    } finally {
      setLoadingMap((prevLoadingMap) => ({
        ...prevLoadingMap,
        [rune._id]: false,
      }));
    }
  };

  const handleBulkBuyRunes = async () => {
    if (selectedRunes.length === 0) {
      dispatch(
        addNotification({
          id: new Date().valueOf(),
          message: "No runes selected",
          open: true,
          severity: "warning",
        })
      );
      return;
    }

    setLoading(true);
    setErrorMap({});
    setLoadingMap({});
    try {
      const runesDetailsArray = selectedRunes.map((rune) => ({
        utxo_id: rune.utxo_id,
        price: rune.listed_price,
      }));

      const body = {
        publickey: walletDetails?.cardinal_pubkey,
        pay_address: walletDetails?.cardinal_address,
        receive_address: walletDetails?.ordinal_address,
        wallet: walletDetails?.wallet,
        fee_rate: feeRate,
        runes: runesDetailsArray,
      };

      console.log({ body });

      const response = await bulkbuyRunes(body);

      if (response?.data?.result) {
        console.log(
          response?.data?.result.unsigned_psbt_base64,
          "----------------response bulk buy"
        );
        setAction("buy");
        setInputLength(response?.data?.result.input_length);
        setUnsignedPsbtBase64(
          response?.data?.result.unsigned_psbt_base64 || ""
        );
      }
    } catch (error:any) {
      selectedRunes.forEach((rune) => {
        setErrorMap((prevErrorMap) => ({
          ...prevErrorMap,
          [rune._id]: error.message || "An error occurred",
        }));
      });
    } finally {
      setLoading(false);
    }
  };

  const signTx = useCallback(async () => {
    if (!walletDetails) {
      dispatch(
        addNotification({
          id: new Date().valueOf(),
          message: "Connect wallet to proceed",
          open: true,
          severity: "warning",
        })
      );
      return;
    }
    let inputs = [];
    console.log({ action });
    if (action === "dummy") {
      inputs.push({
        address: walletDetails.cardinal_address,
        publickey: walletDetails.cardinal_pubkey,
        sighash: 131,
        index: [0],
      });
    } else if (action === "buy") {
      console.log({ inputLength });
      new Array(inputLength).fill(1).map((item: number, idx: number) => {
        console.log({ selectedRunes });
        if (idx === 0 || idx > selectedRunes.length)
          inputs.push({
            address: walletDetails.cardinal_address,
            publickey: walletDetails.cardinal_pubkey,
            sighash: 1,
            index: [idx],
          });
      });
    }
    const options: any = {
      psbt: unsignedPsbtBase64,
      network: "testnet",
      action,
      inputs,
    };
    console.log(options, "OPTIONS");

    await sign(options);
  }, [action, unsignedPsbtBase64]);

  useEffect(() => {
    if (unsignedPsbtBase64) {
      signTx();
    }
  }, [unsignedPsbtBase64]);

  console.log("Sign Result:", result);

  const broadcast = async (signedPsbt: string) => {
    console.log(signedPsbt, "-----------------signedPsbt");
    try {
      const { data } = await axios.post("/api/order/broadcast", {
        signed_psbt: signedPsbt,
        activity_tag: action === "dummy" ? "prepare" : "buy",
        user_address: walletDetails?.cardinal_address,
      });
      setLoading(false);

      dispatch(setNewActivity(true));
      window.open(
        `https://mempool.space/${
          process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet/" : ""
        }tx/${data.data.txid}`,
        "_blank"
      );
      dispatch(
        addNotification({
          id: new Date().valueOf(),
          message: `Broadcasted ${action} Tx Successfully`,
          open: true,
          severity: "success",
        })
      );
      dispatch(
        addNotification({
          id: new Date().valueOf(),
          message: `Txid: ${data.data.txid}`,
          open: true,
          severity: "success",
        })
      );

      router.refresh();
    } catch (err:any) {
      setLoading(false);
      dispatch(
        addNotification({
          id: new Date().valueOf(),
          message: err.response.data.message || "Error broadcasting tx",
          open: true,
          severity: "error",
        })
      );
    }
  };

  useEffect(() => {
    if (result) {
      console.log("Sign Result:", result);
      dispatch(
        addNotification({
          id: new Date().valueOf(),
          message: "Tx signed successfully",
          open: true,
          severity: "success",
        })
      );

      if (result) {
        broadcast(result);
      }
    }

    if (error) {
      console.error("Sign Error:", error);
      dispatch(
        addNotification({
          id: new Date().valueOf(),
          message: error || "Error signing tx",
          open: true,
          severity: "error",
        })
      );
    }
  }, [result, error]);

  const handleRuneSelection = (rune: IBuyRunes) => {
    setSelectedRunes((prevSelected) => {
      if (prevSelected.includes(rune)) {
        return prevSelected.filter((item) => item !== rune);
      } else {
        return [...prevSelected, rune];
      }
    });
  };

  console.log(selectedRunes, "----------------selectd runes");

  return (
    <div className="bg-[#111010]  py-20 mt-10 px-10 md:px-24 h-full">
      <div className="flex flex-col justify-between">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Available Runes
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {runes.map((rune) => (
            <div key={rune._id} className="bg-[#212121] p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">{rune.name}</h2>
                  <p className="text-sm text-white">
                    Price: {convertSatoshiToBTC(rune.listed_price)} BTC
                  </p>
                  <p className="text-sm text-white">
                    USD: ${convertSatoshiToUSD(rune.listed_price, BtcPrice)}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedRunes.includes(rune)}
                  onChange={() => handleRuneSelection(rune)}
                />
              </div>
              <button
                onClick={() => handleBuyRunes(rune)}
                className="mt-4 w-full text-white py-2 px-4 rounded custom-gradient"
                disabled={loadingMap[rune._id]}
              >
                {loadingMap[rune._id] ? "Processing..." : "Buy Rune"}
              </button>
              {errorMap[rune._id] && (
                <p className="text-red-500 mt-2">{errorMap[rune._id]}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-10">
          {selectedRunes.length > 0 && (
            <button
              onClick={handleBulkBuyRunes}
              className="bg-green-500 text-white py-2 px-4 rounded custom-gradient"
              disabled={loading}
            >
              {loading ? "Processing..." : "Buy Selected Runes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyRunePage;

// "use client"
// import { RootState } from "@/stores";
// import { addNotification } from "@/stores/reducers/notificationReducer";
// import { convertSatoshiToBTC, convertSatoshiToUSD } from "@/utils";
// import { useWalletAddress, useSignTx } from "bitcoin-wallet-adapter";
// import React, { useCallback, useEffect, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useRouter } from "next/navigation";
// import axios from "axios";
// import { setNewActivity } from "@/stores/reducers/generalReducer";
// import { IBuyRunes } from "@/types";
// import mempoolJS from "@mempool/mempool.js";
// import { buyRunes } from "@/apiHelper/buyRunes";
// import { getBuyRune } from "@/apiHelper/getBuyRunes";

// interface Props {
//   runes: IBuyRunes[];
// }

// const BuyRunePage = () => {
//   const walletDetails = useWalletAddress();
//   const dispatch = useDispatch();
//   const router = useRouter();
//   const [action, setAction] = useState<string>("");
//   const [runeData, setRuneData] = useState<any>({});
//   const [unsignedPsbtBase64, setUnsignedPsbtBase64] = useState<string>("");
//   const [inputLength, setInputLength] = useState(0);
//   const { loading: signLoading, result, error, signTx: sign } = useSignTx();
//   const [loadingMap, setLoadingMap] = useState<{ [key: string]: boolean }>({});
//   const [errorMap, setErrorMap] = useState<{ [key: string]: string | null }>(
//     {}
//   );
//   const [loading, setLoading] = useState(false);
//   const [feeRate, setFeeRate] = useState(0);
//   const [runes, setRunes] = useState<any[]>([]);
//   // const [defaultFeeRate, setDefaultFeerate] = useState(0);
//   const BtcPrice = useSelector(
//     (state: RootState) => state.general.btc_price_in_dollar
//   );
//   const balanceData = useSelector(
//     (state: RootState) => state.general.balanceData
//   );

//   const Runesutxo = async () => {
//     try {
//       const response = await getBuyRune();
//       console.log(response?.data?.result, "-----------------response");
//       const runes = response?.data?.result;
//       if (runes) {
//         console.log(runes, "-----------------response");
//         setRunes(runes); // Update state only if runes is defined
//       } else {
//         console.log("No data received from API");
//         // Handle case where response.data.result is undefined
//       }

//     } catch (error) {}
//   };
//   console.log(runes,'-------runes')

//   useEffect(() => {
//     Runesutxo();
//   }, []);

//   const fee = async () => {

//     const { bitcoin: { fees } } = mempoolJS({
//       hostname: 'mempool.space',
//       network: 'testnet'
//     });

//     const feesRecommended = await fees.getFeesRecommended();
//     setFeeRate(feesRecommended.fastestFee +10)
//     console.log(feesRecommended);

//   };

//   useEffect(()=> {
//     fee()
//   },[])

//   console.log(feeRate,"-----fee rate")

// console.log(unsignedPsbtBase64,"---------------unsignedPsbtBase64")
//   const handleBuyRunes = async (rune: IBuyRunes) => {
//  console.log(rune,"----------rune buy ")
//     setLoadingMap((prevLoadingMap) => ({
//       ...prevLoadingMap,
//       [rune._id]: true, // Set loading state for specific rune
//     }));
//     setErrorMap((prevErrorMap) => ({
//       ...prevErrorMap,
//       [rune._id]: null, // Clear any previous error for specific rune
//     }));
//     const runeData = rune;
//     console.log(runeData, "---------rune data");
//     setRuneData(runeData);

//     try {
//       const response = await buyRunes({
//         utxo_id: rune.utxo_id,
//         publickey: walletDetails?.cardinal_pubkey,
//         pay_address: walletDetails?.cardinal_address,
//         receive_address: walletDetails?.ordinal_address,
//         wallet: walletDetails?.wallet,
//         fee_rate: feeRate,
//         price: rune.listed_price,
//       });
//       if(response?.data?.result){
//         console.log(
//           response?.data?.result.unsigned_psbt_base64,
//           "----------------response buy button"
//         );
//         // setRune(response?.data?.result)
//         setAction("buy")
//         setInputLength(response?.data?.result.input_length)
//         setUnsignedPsbtBase64(response?.data?.result.unsigned_psbt_base64 || "");

//       }
//       // Handle response data if needed
//     } catch (error:any) {
//       // console.log("error:", error);
//       setErrorMap((prevErrorMap) => ({
//         ...prevErrorMap,
//         [rune._id]: error.message || "An error occurred", // Set error message for specific rune
//       }));
//     } finally {
//       setLoadingMap((prevLoadingMap) => ({
//         ...prevLoadingMap,
//         [rune._id]: false, // Clear loading state for specific rune
//       }));
//     }
//   };

//   const signTx = useCallback(async () => {
//     if (!walletDetails) {
//       dispatch(
//         addNotification({
//           id: new Date().valueOf(),
//           message: "Connect wallet to proceed",
//           open: true,
//           severity: "warning",
//         })
//       );
//       return;
//     }
//     let inputs = [];
//     console.log({action})
//     if (action === "dummy") {
//       inputs.push({
//         address: walletDetails.cardinal_address,
//         publickey: walletDetails.cardinal_pubkey,
//         sighash: 131,
//         index: [0],
//       });
//     } else if (action === "buy") {
//       console.log({inputLength})
//       new Array(inputLength).fill(1).map((item: number, idx: number) => {
//         if (idx !== 1)
//           inputs.push({
//             address: walletDetails.cardinal_address,
//             publickey: walletDetails.cardinal_pubkey,
//             sighash: 1,
//             index: [idx],
//           });
//       });
//     }
//     const options: any = {
//       psbt: unsignedPsbtBase64,
//       network: "testnet",
//       action,
//       inputs,
//     };
//     console.log(options, "OPTIONS");

//     await sign(options);
//   }, [action, unsignedPsbtBase64]);

//   useEffect(() => {
//     if (unsignedPsbtBase64) {
//       signTx();
//     }
//   }, [unsignedPsbtBase64]);

//   console.log("Sign Result:", result);

//   const broadcast = async (signedPsbt: string) => {
//     console.log(signedPsbt, "-----------------signedPsbt");
//     try {
//       const { data } = await axios.post("/api/order/broadcast", {
//         signed_psbt: signedPsbt,
//         activity_tag: action === "dummy" ? "prepare" : "buy",
//         user_address: walletDetails?.cardinal_address,
//       });
//       setLoading(false);

//       dispatch(setNewActivity(true));
//       window.open(
//         `https://mempool.space/${
//           process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet/" : ""
//         }tx/${data.data.txid}`,
//         "_blank"
//       );
//       dispatch(
//         addNotification({
//           id: new Date().valueOf(),
//           message: `Broadcasted ${action} Tx Successfully`,
//           open: true,
//           severity: "success",
//         })
//       );
//       dispatch(
//         addNotification({
//           id: new Date().valueOf(),
//           message: `Txid: ${data.data.txid}`,
//           open: true,
//           severity: "success",
//         })
//       );

//       router.refresh();
//     } catch (err:any) {
//       setLoading(false);
//       dispatch(
//         addNotification({
//           id: new Date().valueOf(),
//           message: err.response.data.message || "Error broadcasting tx",
//           open: true,
//           severity: "error",
//         })
//       );
//     }
//   };

//   useEffect(() => {
//     // Handling Wallet Sign Results/Errors
//     if (result) {
//       // Handle successful result from wallet sign
//       console.log("Sign Result:", result);
//       dispatch(
//         addNotification({
//           id: new Date().valueOf(),
//           message: "Tx signed successfully",
//           open: true,
//           severity: "success",
//         })
//       );

//       if (result) {
//         broadcast(result);
//       }

//       // Additional logic here
//     }

//     if (error) {
//       console.error("Sign Error:", error);
//       dispatch(
//         addNotification({
//           id: new Date().valueOf(),
//           message: error.message || "Wallet error occurred",
//           open: true,
//           severity: "error",
//         })
//       );
//       setLoading(false);
//       // Additional logic here
//     }

//     // Turn off loading after handling results or errors
//     setLoading(false);
//   }, [result, error]);

//   return (
//     <div className="w-full flex flex-wrap gap-4">
//       {runes?.map((rune: any) => (
//         <div
//           className="flex flex-col border-[0.1px] border-customPurple_900 rounded p-3 gap-2"
//           key={rune._id}
//         >
//           <div className="flex flex-col justify-center items-center ">
//           <p> {rune.rune_name}</p>
//             <p>
//               listed price: {convertSatoshiToBTC(rune.listed_price).toFixed(4)}{" "}
//               BTC
//             </p>
//             <p>
//               listed price:{" "}
//               {convertSatoshiToUSD(rune.listed_price, BtcPrice).toFixed(2)} USD
//             </p>
//             {/* <p> {rune.runes[0].amount}</p> */}

//           </div>
//           <div className="flex w-full">
//             <button
//               onClick={() => handleBuyRunes(rune)}
//               className="border border-customPurple_950 rounded flex w-full justify-center items-center cursor-pointer custom-gradient"
//               disabled={loadingMap[rune._id]} // Disable button while loading for specific rune
//             >
//               {loadingMap[rune._id] ? "Loading..." : "Buy Now"}
//             </button>
//           </div>
//           {errorMap[rune._id] && (
//             <p className="text-red-500 mt-2">Error: {errorMap[rune._id]}</p>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// };

// export default BuyRunePage;
