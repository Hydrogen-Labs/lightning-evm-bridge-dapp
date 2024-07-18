import React from "react";
import Discord from "/public/svg/socials/discord.svg";
import Telegram from "/public/svg/socials/telegram.svg";
import Twitter from "/public/svg/socials/x.svg";
import { useGlobalState } from "~~/services/store/store";

/**
 * Site footer
 */
export const Footer = () => {
  const { nativeCurrencyPrice } = useGlobalState();
  // const { targetNetwork } = useTargetNetwork();
  // const isLocalNetwork = targetNetwork.id === hardhat.id;

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
          <div className="flex flex-col md:flex-row gap-5 md:items-center mt-12 md:mt-0">
            <div className="flex flex-row gap-5 mt-6 md:mt-0">
              <div className="w-6 h-6 flex justify-center">
                <a
                  href="https://x.com/RoverStaking"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fill-white hover:fill-black flex justify-center"
                >
                  <Twitter style={{ width: "20px", hight: "20px" }} />
                </a>
              </div>
              <div className="w-6 h-6 flex justify-center">
                <a
                  href="https://discord.com/invite/4YGpjehPpx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fill-white hover:fill-black flex justify-center"
                >
                  <Discord style={{ width: "20px", hight: "20px" }} />
                </a>
              </div>
              <div className="w-6 h-6 flex justify-center">
                <a
                  href="https://t.me/roverstaking"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fill-white hover:fill-black flex justify-center"
                >
                  <Telegram style={{ width: "20px", hight: "20px" }} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex justify-center m-5 text-xs text-white">
            © {currentYear} Hydrogen Labs, Inc. All rights reserved
          </div>
          <div className="flex flex-row gap-2 mt-12 md:mt-0">
            <div className="">
              <span className="text-base text-white font-black cursor-default">
                BTC ${formatBTC(nativeCurrencyPrice)}
              </span>
            </div>
            {/* {isLocalNetwork && (
              <>
                <Faucet />
                <Link href="/blockexplorer" passHref className="btn btn-primary btn-sm font-normal gap-1">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>Block Explorer</span>
                </Link>
              </>
            )} */}
          </div>
        </div>
      </div>
    </>
  );
};
