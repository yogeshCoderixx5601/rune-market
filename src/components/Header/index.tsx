"use client";
import React, { useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Header = () => {


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
        </div>
      </header>
    </div>
  );
};

export default Header;


