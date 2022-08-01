import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployMockContract, MockContract } from "ethereum-waffle";
import DonationAward from "../artifacts/contracts/DonationAward.sol/DonationAward.json";
import Donation from "../artifacts/contracts/Donation.sol/Donation.json";
import { ContractEnum } from "./utils";

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

export { getMockContract };
