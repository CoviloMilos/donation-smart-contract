/* eslint-disable no-unused-vars */
/* eslint-disable node/no-missing-import */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractReceipt, ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { CampaignStatus, ERROR, EVENT } from "./utils";

describe("Donation Smart Contract", function () {
  let DonationContract: Contract;
  let owner: SignerWithAddress;
  let adminOne: SignerWithAddress;
  let vitalik: SignerWithAddress;
  let joe: SignerWithAddress;

  beforeEach(async function () {
    [owner, adminOne, vitalik, joe] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("Donation");
    DonationContract = await factory.connect(owner).deploy();
  });

  describe("After deployed", async function () {
    it("should have owner as first admin", async function () {
      expect(await DonationContract.admins(owner.address)).to.be.true;
    });
  });

  describe("Contract admins", async function () {
    it("should revert assignAdmin if owner is not caller", async function () {
      await expect(
        DonationContract.connect(vitalik).assignAdmin(adminOne.address)
      ).to.be.revertedWith(ERROR.ONLY_ONWER);
    });

    it("should assignAdmin if caller is owner", async function () {
      const adminAddress = vitalik.address;
      const tx: ContractTransaction = await DonationContract.assignAdmin(
        adminAddress
      );

      expect(await DonationContract.admins(adminAddress)).to.be.true;
      await expect(tx)
        .to.emit(DonationContract, EVENT.ADMIN_ASSIGNED)
        .withArgs(adminAddress);
    });

    it("should revert revokeAdmin if owner is not caller", async function () {
      await expect(
        DonationContract.connect(vitalik).revokeAdmin(adminOne.address)
      ).to.be.revertedWith(ERROR.ONLY_ONWER);
    });

    it("should revokeAdmin if caller is owner", async function () {
      const adminAddress = vitalik.address;
      await DonationContract.assignAdmin(adminAddress);

      const tx: ContractTransaction = await DonationContract.revokeAdmin(
        adminAddress
      );

      expect(await DonationContract.admins(adminAddress)).to.be.false;
      await expect(tx)
        .to.emit(DonationContract, EVENT.ADMIN_REVOKED)
        .withArgs(adminAddress);
    });

    it("should revert revokeAdmin if @param is owner address", async function () {
      await expect(
        DonationContract.revokeAdmin(owner.address)
      ).to.be.revertedWith(ERROR.OWNER_REVOKE);
    });
  });

  describe("Campaign", async function () {
    const campaign: any = {};
    before(async function () {
      await DonationContract.assignAdmin(adminOne.address);
    });

    beforeEach(async function () {
      campaign.name = "New Campaign";
      campaign.description = "Campaign to help all kids across the world";
      campaign.timeGoal = 123;
      campaign.moneyToRaisGoal = ethers.utils.parseEther("10");
      campaign.campaignManager = joe.address;
    });

    it("should revert if caller is not admin", async function () {
      await expect(
        DonationContract.connect(vitalik).createCampaign(
          ...Object.values(campaign)
        )
      ).to.be.revertedWith(ERROR.CALLER_NOT_ADMIN);
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
      await expect(
        DonationContract.createCampaign(...Object.values(campaign))
      ).to.be.revertedWith(ERROR.INVALID_TIME_GOAL);
    });

    it("should revert if @param moneyToRaisGoal is less or equal to 0", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      campaign.timeGoal = latestBlock.timestamp + 1;
      campaign.moneyToRaisGoal = ethers.constants.Zero;
      await expect(
        DonationContract.createCampaign(...Object.values(campaign))
      ).to.be.revertedWith(ERROR.INVALID_MONEY_GOAL);
    });

    it("should create new campaign", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      campaign.timeGoal = latestBlock.timestamp + 1;

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
        status,
      ] = await DonationContract.campaigns(campaignId.toString());

      await expect(tx)
        .to.emit(DonationContract, EVENT.CAMPAIGN_CREATED)
        .withArgs(
          owner.address,
          campaign.campaignManager,
          campaignId.toString(),
          campaign.name
        );

      expect(name).to.be.equal(campaign.name);
      expect(description).to.be.equal(campaign.description);
      expect(timeGoal).to.be.equal(campaign.timeGoal);
      expect(moneyToRaisGoal).to.be.equal(campaign.moneyToRaisGoal);
      expect(balance).to.be.equal(0);
      expect(campaignManager).to.be.equal(campaign.campaignManager);
      expect(status).to.be.equal(CampaignStatus.IN_PROGRESS);
    });
  });

  describe("Donate", async function () {
    const campaign: any = {};
    let campaignId: number;
    const FIVE_MINUTES = 5 * 60;

    beforeEach(async function () {
      await DonationContract.assignAdmin(adminOne.address);
      const latestBlock = await ethers.provider.getBlock("latest");

      campaign.name = "New Campaign";
      campaign.description = "Campaign to help all kids across the world";
      campaign.timeGoal = latestBlock.timestamp + FIVE_MINUTES;
      campaign.moneyToRaisGoal = ethers.utils.parseEther("3");
      campaign.campaignManager = joe.address;

      await DonationContract.createCampaign(...Object.values(campaign));
      campaignId = Number(
        (await DonationContract.campaignIdentifer()).toString()
      );
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
      const tx: ContractTransaction = await DonationContract.donate(
        campaignId,
        {
          value: donation,
        }
      );

      const donatedCampaign = await DonationContract.campaigns(campaignId);
      const highestDonation = await DonationContract.highestDonation();

      await expect(tx)
        .to.emit(DonationContract, EVENT.DONATION_CREATED)
        .withArgs(owner.address, donation);

      expect(donatedCampaign.status).to.be.equal(CampaignStatus.COMPLETED);
      expect(highestDonation.donor).to.be.equal(owner.address);
    });
  });

  describe("Withdraw", async function () {
    const campaign: any = {};
    let campaignId: number;
    const FIVE_MINUTES = 5 * 60;

    beforeEach(async function () {
      await DonationContract.assignAdmin(adminOne.address);
      const latestBlock = await ethers.provider.getBlock("latest");

      campaign.name = "New Campaign";
      campaign.description = "Campaign to help all kids across the world";
      campaign.timeGoal = latestBlock.timestamp + FIVE_MINUTES;
      campaign.moneyToRaisGoal = ethers.utils.parseEther("3");
      campaign.campaignManager = joe.address;

      await DonationContract.createCampaign(...Object.values(campaign));
      campaignId = Number(
        (await DonationContract.campaignIdentifer()).toString()
      );
    });

    it("should withdraw funds to campaign manager wallet", async function () {
      const joeBalance = await joe.getBalance();
      const campaignMoneyRaisGoal = campaign.moneyToRaisGoal;

      await DonationContract.connect(vitalik).donate(campaignId, {
        value: ethers.utils.parseEther("4"),
      });

      const tx: ContractTransaction = await DonationContract.connect(
        joe
      ).withdrawFunds(campaignId);

      const receipt: ContractReceipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
  
      const balanceAfter = await joe.getBalance();


      
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
});
