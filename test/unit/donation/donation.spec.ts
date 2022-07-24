import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { deployMockContract, MockContract } from "ethereum-waffle";
import { Contract, ContractTransaction, Signer } from "ethers";
import { ethers, network } from "hardhat";
import {
  CampaignStatus,
  ERROR,
  EVENT,
  getValidTimeGoal,
  newCampaign,
  tokenID,
} from "./utils";
import DonationAward from "../../../artifacts/contracts/DonationAward.sol/DonationAward.json";

describe("Donation Smart Contract", function () {
  let DonationContract: Contract;
  let owner: SignerWithAddress;
  let vitalik: SignerWithAddress;
  let joe: SignerWithAddress;
  let MockDonationAward: MockContract;
  let campaign: any = {};
  const FIVE_MINUTES = 5 * 60;

  before(async function () {
    [owner, vitalik, joe] = await ethers.getSigners();

    MockDonationAward = await deployMockContract(vitalik, DonationAward.abi);
    await MockDonationAward.deployed();

    const contractFactory = await ethers.getContractFactory("Donation");
    DonationContract = await contractFactory
      .connect(owner)
      .deploy(MockDonationAward.address);
  });

  beforeEach(async function () {
    campaign = newCampaign(joe.address);
    campaign.timeGoal = await getValidTimeGoal(FIVE_MINUTES);
  });

  describe("After deployed", async function () {
    it("should have Donation Award Contract address", async function () {
      expect(await DonationContract.donationAwardContractAddress()).to.be.eq(
        MockDonationAward.address
      );
    });
  });

  describe("Campaign", async function () {
    it("should revert if caller is not owner", async function () {
      await expect(
        DonationContract.connect(vitalik).createCampaign(
          ...Object.values(campaign)
        )
      ).to.be.revertedWith(ERROR.ONLY_ONWER);
    });

    it("should revert if @param name is empty string", async function () {
      campaign.name = "";
      await expect(
        DonationContract.createCampaign(...Object.values(campaign))
      ).to.be.revertedWith(ERROR.EMPTY_STRING);
    });

    it("should revert if @param description is empty string", async function () {
      campaign.description = "";
      await expect(
        DonationContract.createCampaign(...Object.values(campaign))
      ).to.be.revertedWith(ERROR.EMPTY_STRING);
    });

    it("should revert if @param timeGoal is less then timestamp of latest block", async function () {
      campaign.timeGoal = 123;
      await expect(
        DonationContract.createCampaign(...Object.values(campaign))
      ).to.be.revertedWith(ERROR.INVALID_TIME_GOAL);
    });

    it("should revert if @param moneyToRaisGoal is less or equal to 0", async function () {
      campaign.moneyToRaisGoal = ethers.constants.Zero;
      await expect(
        DonationContract.createCampaign(...Object.values(campaign))
      ).to.be.revertedWith(ERROR.INVALID_MONEY_GOAL);
    });

    it("should create new campaign", async function () {
      const tx: ContractTransaction = await DonationContract.createCampaign(
        ...Object.values(campaign)
      );
      const campaignId = await DonationContract.campaignIdentifer();

      const [
        name,
        description,
        timeGoal,
        moneyToRaisGoal,
        balance,
        campaignManager,
        tokenURI,
        status,
      ] = await DonationContract.campaigns(campaignId.toString());

      await expect(tx)
        .to.emit(DonationContract, EVENT.CAMPAIGN_CREATED)
        .withArgs(
          owner.address,
          campaign.campaignManager,
          campaignId.toString()
        );

      expect(name).to.be.equal(campaign.name);
      expect(description).to.be.equal(campaign.description);
      expect(timeGoal).to.be.equal(campaign.timeGoal);
      expect(moneyToRaisGoal).to.be.equal(campaign.moneyToRaisGoal);
      expect(balance).to.be.equal(0);
      expect(campaignManager).to.be.equal(campaign.campaignManager);
      expect(tokenURI).to.be.equal(campaign.tokenURI);
      expect(status).to.be.equal(CampaignStatus.IN_PROGRESS);
    });
  });

  describe("Donate", async function () {
    let campaignId: number;

    before(async function () {
      await MockDonationAward.mock.awardNft.returns(tokenID);
    });

    beforeEach(async function () {
      await DonationContract.createCampaign(...Object.values(campaign));
      campaignId = await DonationContract.campaignIdentifer();
    });

    it("should revert if campaign by @param id doesn't exist", async function () {
      await expect(
        DonationContract.donate(98765, { value: ethers.constants.One })
      ).to.revertedWith(ERROR.CAMPAIGN_NOT_FOUND);
    });

    it("should revert if campaign has status of COMPLETED", async function () {
      await DonationContract.connect(vitalik).donate(campaignId, {
        value: ethers.utils.parseEther("4"),
      });

      await expect(
        DonationContract.donate(campaignId, { value: ethers.constants.One })
      ).to.revertedWith(ERROR.CAMPAIGN_COMPLETED);
    });

    it("should revert if donation is less or equal to 0", async function () {
      await expect(
        DonationContract.donate(campaignId, { value: 0 })
      ).to.revertedWith(ERROR.INSUFFICIENT_DONATION);
    });

    it("should make campaign completed after donation", async function () {
      const donation = ethers.utils.parseEther("5");
      const tx: ContractTransaction = await DonationContract.connect(
        vitalik
      ).donate(campaignId, {
        value: donation,
      });

      const donatedCampaign = await DonationContract.campaigns(campaignId);
      const highestDonation = await DonationContract.highestDonation();

      await expect(tx)
        .to.emit(DonationContract, EVENT.DONATION_CREATED)
        .withArgs(vitalik.address, donation);
      await expect(tx)
        .to.emit(DonationContract, EVENT.DONATOR_AWARDED)
        .withArgs(vitalik.address, campaignId, tokenID);

      // AssertionError: Waffle's calledOnContract is not supported by Hardhat
      // expect("awardNft").to.be.calledOnContract(MockDonationAward);

      expect(donatedCampaign.status).to.be.equal(CampaignStatus.COMPLETED);
      expect(highestDonation.donor).to.be.equal(vitalik.address);
    });

    it("should make campaign completed after time goal is reached", async function () {
      await network.provider.send("evm_setNextBlockTimestamp", [
        campaign.timeGoal + FIVE_MINUTES,
      ]);
      await network.provider.send("evm_mine");
      const donation = ethers.utils.parseEther("5");
      const tx: ContractTransaction = await DonationContract.donate(
        campaignId,
        {
          value: donation,
        }
      );

      const donatedCampaign = await DonationContract.campaigns(campaignId);

      await expect(tx).to.emit(
        DonationContract,
        EVENT.CAMPAIGN_TIME_GOAL_REACHED
      );
      expect(donatedCampaign.status).to.be.equal(CampaignStatus.COMPLETED);
    });
  });

  describe("Withdraw", async function () {
    let campaignId: number;

    beforeEach(async function () {
      await DonationContract.createCampaign(...Object.values(campaign));
      campaignId = await DonationContract.campaignIdentifer();
    });

    it("should withdraw funds to campaign manager wallet", async function () {
      await DonationContract.connect(vitalik).donate(campaignId, {
        value: ethers.utils.parseEther("4"),
      });

      const tx: ContractTransaction = await DonationContract.connect(
        joe
      ).withdrawFunds(campaignId);

      const archivedCampaignIdentifier = (
        await DonationContract.archivedCampaignIdentifer()
      ).toString();

      const archivedCampaign = await DonationContract.archivedCampaigns(
        archivedCampaignIdentifier
      );

      await expect(tx).to.emit(DonationContract, EVENT.FUNDS_WITHDRAWED);
      await expect(tx)
        .to.emit(DonationContract, EVENT.CAMPAIGN_ARCHIVED)
        .withArgs(archivedCampaignIdentifier);
      expect(archivedCampaign.status).to.be.equal(CampaignStatus.ARCHIVED);
    });

    it("should revert if campaign by @param id doesn't exist", async function () {
      await expect(
        DonationContract.connect(joe).withdrawFunds(98765)
      ).to.revertedWith(ERROR.CAMPAIGN_NOT_FOUND);
    });

    it("should revert if campaign by @param id is not completed", async function () {
      await expect(
        DonationContract.connect(joe).withdrawFunds(campaignId)
      ).to.revertedWith(ERROR.CAMPAIGN_IN_PROGRESS);
    });

    it("should revert if caller is not campaign manager", async function () {
      await DonationContract.connect(vitalik).donate(campaignId, {
        value: ethers.utils.parseEther("4"),
      });

      await expect(DonationContract.withdrawFunds(campaignId)).to.revertedWith(
        ERROR.WITHDRAW_FORBIDDEN
      );
    });
  });

  describe("Helpers", async function () {
    it("should return true if timeGoal is reached", async function () {
      expect(await DonationContract.timeGoalReached(1)).to.be.true;
    });

    it("should have highest donation", async function () {
      const amount = ethers.utils.parseEther("10");
      await DonationContract.checkHighestDonation(amount);
      const highestDonation = await DonationContract.highestDonation();

      expect(highestDonation.amount).to.be.equal(amount);
    });
  });
});
