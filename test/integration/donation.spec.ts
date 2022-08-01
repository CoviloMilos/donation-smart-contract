import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import {
  ContractEnum,
  EVENT,
  getValidTimeGoal,
  newCampaign,
  tokenID,
} from "../utils";

describe("Integration", function () {
  let DonationContract: Contract;
  let DonationAwardContract: Contract;
  let owner: SignerWithAddress;
  let joe: SignerWithAddress;
  const FIVE_MINUTES = 5 * 60;

  async function deploy() {
    [owner, joe] = await ethers.getSigners();

    const donationAwardFactory = await ethers.getContractFactory(
      ContractEnum.DONATION_AWARD
    );
    DonationAwardContract = await donationAwardFactory.deploy();

    const donationFactory = await ethers.getContractFactory(
      ContractEnum.DONATION
    );
    DonationContract = await donationFactory
      .connect(owner)
      .deploy(DonationAwardContract.address);

    await DonationAwardContract.transferOwnership(owner.address);
  }

  beforeEach(async function () {
    await loadFixture(deploy);
  });

  it("should have same contract owner on both contracts", async function () {
    expect(await DonationContract.owner()).to.be.eq(
      await DonationAwardContract.owner()
    );
  });

  it("should have Donation Award Contract address", async function () {
    expect(await DonationContract.donationAwardContractAddress()).to.be.eq(
      DonationAwardContract.address
    );
  });

  it("should award donator after donation", async function () {
    const campaign = newCampaign(joe.address);
    campaign.timeGoal = await getValidTimeGoal(FIVE_MINUTES);

    await DonationContract.createCampaign(...Object.values(campaign));
    const campaignId = await DonationContract.campaignIdentifer();
    const donation = ethers.utils.parseEther("5");

    const tx = await DonationContract.connect(joe).donate(campaignId, {
      value: donation,
    });

    await expect(tx)
      .to.emit(DonationContract, EVENT.DONATOR_AWARDED)
      .withArgs(joe.address, campaignId, tokenID);

    await expect(tx).to.emit(DonationAwardContract, EVENT.NFT_MINTED);

    expect(await DonationAwardContract.ownerOf(tokenID)).to.equal(joe.address);
  });
});
