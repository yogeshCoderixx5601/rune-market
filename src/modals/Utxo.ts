import { Schema} from "mongoose";

const statusSchema = new Schema(
  {
    confirmed: { type: Boolean, required: true },
    block_height: { type: Number },
    block_hash: { type: String },
    block_time: { type: Number },
  },
  { _id: false }
);

export const utxoSchema = new Schema({
  address: { type: String, required: true },
  txid: { type: String, required: true },
  vout: { type: Number, required: true },
  utxo_id: { type: String, required: true, unique:true },
  value: { type: Number, required: true },
  status: { type: statusSchema, required: true },
  rune_name: { type: String, required: true },
  rune_amount: { type: Number, required: true },
  rune_divisibility: { type: Number, required: true },
  rune_symbol: { type: String },
  signed_listing_psbt_base64: { type: String },
  maker_fee_bp: { type: Number, default: 100 },
  seller_receive_address: { type: String },
  price: { type: Number },
  unsigned_listing_psbt_base64: { type: String },
  listed: { type: Boolean, default: false },
  listed_at: { type: Date },
  listed_price: { type: Number },
  listed_price_per_token: { type: Number },
  listed_seller_receive_address: { type: String },
  signed_psbt: { type: String },
  unsigned_psbt: { type: String },
  listed_maker_fee_bp: { type: Number, default: 100 },
  in_memepool:{type:Boolean, default:false}
});
