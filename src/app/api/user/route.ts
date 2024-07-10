// add user details and empty [runes]

import dbConnect from "@/lib/dbconnect";
import { User } from "@/modals";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("*********INSIDE USER API**********");
  try {
    const userDetails = await req.json();
    console.log(userDetails, "-----userDetails");
    await dbConnect();

    // const existingUser = await User.findOne({
    //   ordinal_adddress: userDetails.ordinal_adddress,
    // });

    // console.log(existingUser,"-----------existingUser")
    // if (existingUser) {
    //   // User already exists, return an appropriate response
    //   return NextResponse.json({ message: "User already exists" });
    // }
    // Create a new user based on the schema
    const user = new User(userDetails);

    // Save the user to the database
    await user.save();
    return NextResponse.json({ userDetails, message: "user created" });
  } catch (error) {
    console.log(error, "-----------error");
    return NextResponse.json({ message: "false" });
  }
}
