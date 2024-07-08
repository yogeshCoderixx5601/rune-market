"use client";
import React, { useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ConnectMultiButton,
  Notification,
  useWalletAddress,
} from "bitcoin-wallet-adapter";
import { getBTCPriceInDollars, shortenString } from "@/utils";
import { useDispatch, useSelector } from "react-redux";
import {
  FaFaceFrown,
  FaFaceGrinStars,
  FaFaceMeh,
  FaFaceSadCry,
  FaFaceSmile,
  FaFaceSmileWink,
  FaPowerOff,
} from "react-icons/fa6";
import { FiCopy } from "react-icons/fi";
import { Popover } from "@mui/material";
import { setBTCPrice, setUser } from "@/stores/reducers/generalReducer";
import { addNotification } from "@/stores/reducers/notificationReducer";
import copy from "copy-to-clipboard";
import { RootState } from "@/stores";
import { MdOutlineDashboard } from "react-icons/md";
import { addUser } from "@/apiHelper/addUserDetails";
import { addUtxos } from "@/apiHelper/addUtxos";

const Header = () => {
  const dispatch = useDispatch();
  const walletDetails = useWalletAddress();
  // console.log(walletDetails,"---wallet details")

  async function collectWalletDetails() {
    if (walletDetails && walletDetails.wallet) {
      dispatch(setUser(walletDetails));
    } else {
      dispatch(setUser(null));
    }
  }
  useEffect(() => {
    collectWalletDetails();
  }, [walletDetails]);

  async function getBTCPrice() {
    const btcPrice = await getBTCPriceInDollars();
    if (btcPrice) dispatch(setBTCPrice(btcPrice));
  }
  useEffect(() => {
    getBTCPrice();
  }, []);

  const BtcPrice = useSelector(
    (state: RootState) => state.general.btc_price_in_dollar
  );
  console.log(BtcPrice, "=---------btcPrice");

  const addUserDetails = async () => {
    try {
      if (walletDetails && walletDetails.wallet && walletDetails.connected) {
        const user = await addUser(walletDetails);
        console.log(user, "---user");
      }
    } catch (error) {
      console.log(error, "error");
    }
  };

  useEffect(() => {
    addUserDetails();
  }, [walletDetails]);

  console.log(walletDetails,"----------wallet details")
  const addURunesDetails = async () => {
    try {
      if (walletDetails && walletDetails.wallet && walletDetails.connected) {
        const runes = await addUtxos(walletDetails);
        console.log(runes, "---runes");
      }
    } catch (error) {
      console.log(error, "error");
    }
  };

  useEffect(() => {
    addURunesDetails();
  }, [walletDetails]);

  const pathname = usePathname();
  const isActive = (i: any) => i === pathname;
  return (
    <div className="fixed left-0 right-0 top-0 z-[1200] bg-primary w-full">
      <header className="w-full">
        <div className="lg:flex w-full justify-between p-2 py-6 items-center border-b border-[#191919] hidden ">
          <div className="w-2/12 text-[32px] text-start font-bold  text-white shadow-lg">
            <Link href={"/"} className="cursor-pointer">
              AGGR
            </Link>
          </div>

          <Notification />

          <div className="w-2/12 btn relative inline-flex items-center lg:justify-end overflow-hidden font-medium rounded group cursor-default">
            <ConnectMultiButton
              modalContentClass="bg-customPurple_950 border rounded-xl border-customPurple_950 overflow-hidden relative lg:p-16 md:p-12 p-6"
              buttonClassname={`text-white rounded flex items-center px-4 py-[10px] ${
                walletDetails
                  ? "font-bold bg-secondary  border border-dark_gray rounded-md opacity-90  custom-gradient"
                  : "font-light custom-gradient"
              }`}
              headingClass="text-center text-white pt-2 pb-2 text-3xl capitalize font-bold mb-4"
              walletItemClass="w-full bg-customPurple_800 my-3 hover:border-customPurple_800 border border-transparent "
              walletLabelClass="text-lg text-white capitalize tracking-wider"
              walletImageClass="w-[30px]"
              InnerMenu={InnerMenu}
              // balance={balanceData?.balance}
            />
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;

export const Face = ({ balance }: { balance: number }) => {
  let balInBTC = balance / 100_000_000;

  console.log({ balInBTC }, "BTCBAL");

  // Check from the highest threshold down to the lowest
  if (balInBTC >= 0.01) {
    return <FaFaceSmileWink />;
  } else if (balInBTC >= 0.001) {
    return <FaFaceSmile />;
  } else if (balInBTC >= 0.0005) {
    return <FaFaceMeh />;
  } else if (balInBTC >= 0.0001) {
    return <FaFaceFrown />;
  } else if (balInBTC <= 0) {
    return <FaFaceSadCry />;
  } else {
    // For any case not covered above, though technically this branch might never be reached with the current logic
    return <FaFaceGrinStars />;
  }
};

export const InnerMenu = ({ anchorEl, open, onClose, disconnect }: any) => {
  const walletDetails = useWalletAddress();
  const dispatch = useDispatch();
  const resetWalletDetails = () => {
    // clearing the localstorage
    Object.entries(localStorage).forEach(([key]) => {
      if (key.startsWith("walletBalance-")) localStorage.removeItem(key);
    });
  };

  if (walletDetails)
    return (
      <Popover
        anchorEl={anchorEl}
        onClose={onClose}
        open={open}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <div className="p-6 bg-customPurple_950 min-w-[300px] xl:min-w-[400px] max-w-[400px] relative text-white">
          <div className="intro flex items-center pb-6">
            <p className="uppercase font-bold text-sm">
              {shortenString(walletDetails.cardinal_address, 5)}
            </p>
          </div>
          <div className="BTCWallet flex items-center pb-6 w-full">
            <div className="mr-2">
              <img alt="" src="/static-assets/images/btc.png" width={35} />
            </div>
            <div className="flex-1 flex  items-center text-sm">
              <div>
                <p className="font-bold tracking-wider text-white">
                  BTC Wallet
                </p>
                <div className="flex items-center">
                  <p className="uppercase">
                    {shortenString(walletDetails.cardinal_address, 5)}
                  </p>
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      copy(walletDetails?.cardinal_address + "");
                      dispatch(
                        addNotification({
                          id: new Date().valueOf(),
                          message: "Address Copied",
                          open: true,
                          severity: "success",
                        })
                      );
                    }}
                  >
                    <FiCopy className="ml-2 hover:text-green-600 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="OrdinalsWallet flex items-center pb-6 w-full">
            <div className="mr-2">
              <img alt="" src="/static-assets/images/ord.png" width={35} />{" "}
            </div>
            <div className="flex-1 flex justify-between items-center text-sm">
              <div className="">
                <p className="font-bold tracking-wider text-white">
                  Ordinals Wallet
                </p>
                <div className="flex items-center">
                  <p className="uppercase">
                    {shortenString(walletDetails.ordinal_address, 5)}
                  </p>
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      copy(walletDetails?.ordinal_address + "");
                      dispatch(
                        addNotification({
                          id: new Date().valueOf(),
                          message: "Address Copied",
                          open: true,
                          severity: "success",
                        })
                      );
                    }}
                  >
                    <FiCopy className="ml-2 hover:text-green-600 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative ">
            <div className="w-full custom-gradient rounded cursor-pointer styled-button-wrapper my-2 ">
              <Link
                href={"/dashboard"}
                className="red_transition p-2 w-full flex justify-center items-center"
              >
                <MdOutlineDashboard className="mr-2" />
                <span className="">Dashboard</span>
              </Link>
            </div>
          </div>

          <div className="relative ">
            <div className="w-full custom-gradient rounded cursor-pointer styled-button-wrapper my-2 ">
              <button
                className="red_transition p-2 w-full flex justify-center items-center"
                onClick={() => {
                  disconnect();
                  resetWalletDetails();
                  onClose();
                }}
              >
                <FaPowerOff className="mr-2" />{" "}
                <span className="">Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      </Popover>
    );
  else null;
};

