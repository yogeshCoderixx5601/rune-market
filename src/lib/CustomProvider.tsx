"use client";
import { WalletProvider } from "bitcoin-wallet-adapter";
import { Provider } from "react-redux";
import { store } from "@/stores";
export default function CustomProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Provider store={store}>
      <WalletProvider customAuthOptions={{ network: "testnet" }}>
        {children}
      </WalletProvider>
    </Provider>
  );
}