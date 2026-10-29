
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Counter — Security Audit", function () {
  let counter, owner, attacker;

  beforeEach(async function () {
    [owner, attacker] = await ethers.getSigners();

    const Counter = await ethers.getContractFactory("Counter");
    counter = await Counter.deploy();
    await counter.waitForDeployment();
  });

  it("ACCESS CONTROL: any wallet can increment", async function () {
    await counter.connect(attacker).increment();

    expect(await counter.getCount()).to.equal(1n);
  });

  it("ACCESS CONTROL: any wallet can decrement", async function () {
    await counter.connect(owner).increment();
    await counter.connect(attacker).decrement();

    expect(await counter.getCount()).to.equal(0n);
  });

  it("INPUT VALIDATION: rejects decrementing below zero", async function () {
    await expect(
      counter.connect(attacker).decrement()
    ).to.be.revertedWith("Counter cannot go below zero");

    expect(await counter.getCount()).to.equal(0n);
  });

  it("STATE CONSISTENCY: increments and decrements correctly", async function () {
    await counter.increment();
    await counter.increment();
    await counter.decrement();

    expect(await counter.getCount()).to.equal(1n);
  });

  it("EVENTS: identifies the wallet changing the counter", async function () {
    await expect(counter.connect(attacker).increment())
      .to.emit(counter, "CountChanged")
      .withArgs(1n, attacker.address);
  });

  it("INPUT VALIDATION: decrement failure does not change state", async function () {
    await expect(counter.decrement()).to.be.reverted;

    expect(await counter.getCount()).to.equal(0n);
  });
});
