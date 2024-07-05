import { Schema } from "mongoose";

const runeSchema = new Schema({
   name: {
     type: String,
     required: true,
   },
   amount: {
     type: Number,
     required: true,
   },
 });

export const userSchema = new Schema({
 ordinal_address:{
    type:String,
    required:true,
 },
 cardinal_address:{
    type:String,
    required:true,
 },
 ordinal_pubkey:{
    type:String,
    required:true,
 },
 cardinal_pubkey:{
    type:String,
    required:true,
 },
 wallet:{
    type:String,
    required:true,
 }, 
 connected: {
    type: Boolean,
    default: false,
},
runes: [runeSchema],
});
