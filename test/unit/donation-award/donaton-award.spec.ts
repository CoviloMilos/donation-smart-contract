import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { tokenURI } from "../../mocks";
import {
  ContractEnum,
  DONATION_AWARD_NAME,
  DONATION_AWARD_SYMBOL,
  EVENT,
} from "../../utils";

describe("Donation Award Contract", function () {
  let DonationAwardContract: Contract;
  let owner: SignerWithAddress;

  async function deployDonationAward() {
    [owner] = await ethers.getSigners();

    const contractFactory = await ethers.getContractFactory(
      ContractEnum.DONATION_AWARD
    );
    DonationAwardContract = await contractFactory.connect(owner).deploy();
  }

  beforeEach(async function () {
    await loadFixture(deployDonationAward);
  });

  it(`should have symbol ${DONATION_AWARD_SYMBOL}`, async function () {
    expect(await DonationAwardContract.symbol()).to.be.eq(
      DONATION_AWARD_SYMBOL
    );
  });

  it(`should have name ${DONATION_AWARD_NAME}`, async function () {
    expect(await DonationAwardContract.name()).to.be.eq(DONATION_AWARD_NAME);
  });

  it(`should award NFT to donator`, async function () {
    const tx = await DonationAwardContract.awardNft(owner.address, tokenURI);
    const rc = await tx.wait();
    const event = rc.events!.find(
      (event: any) => event.event === EVENT.NFT_MINTED
    );

    const [donator, tokenID] = event!.args || [];

    await expect(tx)
      .to.emit(DonationAwardContract, EVENT.NFT_MINTED)
      .withArgs(donator, (tokenID as BigNumber).toNumber());

    expect(owner.address).to.be.eq(donator);
  });
});
