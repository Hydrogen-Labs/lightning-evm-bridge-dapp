import React from "react";
import Globe from "/public/svg/socials/globe.svg";
import Twitter from "/public/svg/socials/x.svg";
import { useGlobalState } from "~~/services/store/store";

export const Footer = () => {
  const { nativeCurrencyPrice } = useGlobalState();

  function formatBTC(value: number) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // get the current year
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="w-full bg-transparent flex flex-col">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center w-full px-10 pt-10">
          <div className="flex flex-col md:flex-row gap-5 items-center mt-12 md:mt-0">
            <div className="flex flex-row gap-5 mt-6 md:mt-0 ">
              <div className="w-6 h-6 flex justify-center">
                <a
                  href="https://hydrogenlabs.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fill-neutral-content hover:fill-warning flex justify-center items-center"
                >
                  <Globe style={{ width: "20px", height: "20px" }} />
                </a>
              </div>
              <div className="w-6 h-6 flex justify-center">
                <a
                  href="https://x.com/RoverStaking"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fill-neutral-content hover:fill-warning flex justify-center items-center"
                >
                  <Twitter style={{ width: "20px", hight: "20px" }} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex md:hidden mt-5 flex-row items-center justify-center">
            <span className="text-base text-white font-black cursor-default">
              BTC ${formatBTC(nativeCurrencyPrice)}
            </span>
          </div>
          <div className="flex justify-center m-5 text-[0.5rem] md:text-xs text-white">
            © {currentYear} Hydrogen Labs, Inc. All rights reserved
          </div>
          <div className="hidden md:flex flex-row items-center justify-center">
            <span className="text-base text-white font-black cursor-default">
              BTC ${formatBTC(nativeCurrencyPrice)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
