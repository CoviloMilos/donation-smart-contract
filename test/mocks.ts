import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockContract, MockContract } from "ethereum-waffle";
import DonationAward from "../artifacts/contracts/DonationAward.sol/DonationAward.json";
import Donation from "../artifacts/contracts/Donation.sol/Donation.json";
import { ContractEnum } from "./utils";
import { ethers } from "hardhat";

const getMockContract = async (
  ctr: ContractEnum,
  address: SignerWithAddress
): Promise<MockContract> => {
  let mockContract: MockContract;
  let abi: any;

  if (ctr === ContractEnum.DONATION) {
    abi = Donation.abi;
  } else if (ctr === ContractEnum.DONATION_AWARD) {
    abi = DonationAward.abi;
  } else throw new Error("Uknown contract");

  mockContract = await deployMockContract(address, abi);
  await mockContract.deployed();
  return mockContract;
};

const tokenID = 1;
const FIVE_MINUTES = 5 * 60;
const tokenURI =
  "https://gateway.pinata.cloud/ipfs/QmPhKYBCd6j2YXCzhiiExP5kowaxjrs7jouiaPD41z1J5X";

const getValidTimeGoal = async () => {
  let { timestamp } = await ethers.provider.getBlock("latest");
  timestamp += FIVE_MINUTES;

  return timestamp;
};

const newCampaign = async (managerAddress?: any) => {
  const timeGoal = await getValidTimeGoal();
  return {
    name: "New Campaign",
    description: "Campaign to help all kids across the world",
    timeGoal,
    moneyToRaisGoal: ethers.utils.parseEther("3"),
    tokenURI,
    campaignManager: managerAddress,
  };
};

export { getMockContract, tokenID, FIVE_MINUTES, tokenURI, newCampaign };
