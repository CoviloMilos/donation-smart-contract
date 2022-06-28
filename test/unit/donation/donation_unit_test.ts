import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractTransaction, Signer } from "ethers";
import { ethers } from "hardhat";
import { ERROR, EVENT } from "./utils";

describe("Donation Smart Contract", function () {
  let DonationContract: Contract;
  let owner: SignerWithAddress;
  let adminOne: SignerWithAddress;
  let vitalik: SignerWithAddress;

  beforeEach(async function () {
    [owner, adminOne, vitalik] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("Donation");
    DonationContract = await factory.connect(owner).deploy();
  });

  describe("After deployed", async function () {
    it("should have owner equal to contract deployer", async function () {
      expect(await DonationContract.owner()).to.be.equal(owner.address);
    });

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
      expect(tx)
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
      expect(tx)
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
    before(async function () {
      await DonationContract.assignAdmin(adminOne.address);
    });

    it("should revert if caller is not admin", async function () {
      await expect(
        DonationContract.connect(vitalik).createCampaign(
          "Test",
          "test",
          2131232,
          3232323,
          vitalik.address
        )
      ).to.be.revertedWith("CallerNotAdmin()");
    });
  });
});
