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