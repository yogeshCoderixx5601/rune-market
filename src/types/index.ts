import * as bitcoin from "bitcoinjs-lib";
export interface IUser {
    ordinal_address: string ;
    cardinal_address: string ;
    ordinal_pubkey: string ;
    cardinal_pubkey: string ;
    wallet: any;
    connected?: boolean;
  }

  export interface AddressTxsUtxo {
    address: string;
    utxo_id: string;
    rune: any;
    txid: string;
    vout: number;
    status: TxStatus;
    value: number;
  }

  export interface TxStatus {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  }

  export interface IBalanceData {
    balance: number;
    mempool_balance: number;
    mempool_txs: string[];
    dummyUtxos?: number;
  }

  export interface UTXO {
    status: {
      block_hash: string;
      block_height: number;
      block_time: number;
      confirmed: boolean;
    };
    txid: string;
    value: number;
    vout: number;
    tx: bitcoin.Transaction;
  }

  export interface Status {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  }
  
  export interface ListedInfo {
    listed: boolean;
    listed_at: string;
    listed_maker_fee_bp: number;
    listed_price: number;
    listed_price_per_token: number;
    listed_seller_receive_address: string;
  }
  export interface IBuyRunes {
    listed_price: number;
    _id: string;
    txid: string;
    vout: number;
    utxo_id: string;
    address: string;
    status: Status;
    value: number;
    __v: number;
    listed_info: ListedInfo;
  }

  export interface IListingState {
    seller: {
      makerFeeBp: number;
      sellerOrdAddress: string;
      price: number;
      ordItem: any;
      sellerReceiveAddress: string;
      unsignedListingPSBTBase64?: string;
      signedListingPSBTBase64?: string;
      tapInternalKey?: string;
    };
  
    buyer: {
      takerFeeBp: number;
      buyerAddress: string;
      buyerTokenReceiveAddress: string;
      fee_rate: number;
      buyerPublicKey: string;
      unsignedBuyingPSBTBase64?: string;
      unsignedBuyingPSBTInputSize?: number;
      signedBuyingPSBTBase64?: string;
      buyerDummyUTXOs?: UTXO[];
      buyerPaymentUTXOs?: AddressTxsUtxo[]; // after the selection
      mergedSignedBuyingPSBTBase64?: string;
    };
  }

export interface UtxoData {
    _id: string;
    address: string;
    txid: string;
    vout: number;
    utxo_id: string;
    value: number;
    status: Status;
    rune_name: string;
    rune_amount: number;
    rune_divisibility: number;
    rune_symbol: string;
    maker_fee_bp: number;
    listed?: boolean;
    listed_maker_fee_bp: number;
    __v: number;
    listed_at: string;
    listed_price: number;
    listed_price_per_token: number;
    listed_seller_receive_address: string;
    signed_psbt: string;
}

export interface RuneUtxo {
  in_memepool: boolean;
  _id: string;
  address: string;
  txid: string;
  vout: number;
  utxo_id: string;
  value: number;
  status: Status;
  rune_name: string;
  rune_amount: number;
  rune_divisibility: number;
  rune_symbol: string;
  maker_fee_bp: number;
  listed: boolean;
  listed_maker_fee_bp: number;
  __v: number;
  listed_at: string;
  listed_price: number;
  listed_price_per_token: number;
  listed_seller_receive_address: string;
  signed_psbt: string;
}