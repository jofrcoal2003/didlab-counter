
const { expect } = require("chai");
const { ethers } = require("hardhat");

const DIGEST = "0x" + "11".repeat(32);
const CID = "bafyTESTCIDPLACEHOLDER";

describe("AnchorRegistry", function () {
  let reg, admin, submitter, verifier, outsider;
  let ADMIN, SUBMITTER, VERIFIER, recordId;

  beforeEach(async function () {
    [admin, submitter, verifier, outsider] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("AnchorRegistry");
    reg = await Factory.deploy();
    await reg.waitForDeployment();

    ADMIN = await reg.ADMIN();
    SUBMITTER = await reg.SUBMITTER();
    VERIFIER = await reg.VERIFIER();

    recordId = ethers.keccak256(ethers.toUtf8Bytes("batch-0001"));

    await reg.grantRole(SUBMITTER, submitter.address);
    await reg.grantRole(VERIFIER, verifier.address);
  });

  it("gives the deployer ADMIN only", async function () {
    expect(await reg.hasRole(ADMIN, admin.address)).to.equal(true);
    expect(await reg.hasRole(SUBMITTER, admin.address)).to.equal(false);
  });

  it("lets a submitter anchor a record", async function () {
    await expect(reg.connect(submitter).anchor(recordId, DIGEST, CID))
      .to.emit(reg, "RecordAnchored");

    const r = await reg.get(recordId);
    expect(r.digest).to.equal(DIGEST);
    expect(r.cid).to.equal(CID);
    expect(r.submitter).to.equal(submitter.address);
  });

  it("rejects an anchor from an account without SUBMITTER", async function () {
    await expect(reg.connect(outsider).anchor(recordId, DIGEST, CID))
      .to.be.revertedWithCustomError(reg, "NotAuthorized");
  });

  it("rejects an empty digest", async function () {
    await expect(reg.connect(submitter).anchor(recordId, ethers.ZeroHash, CID))
      .to.be.revertedWithCustomError(reg, "EmptyDigest");
  });

  it("rejects anchoring the same record twice", async function () {
    await reg.connect(submitter).anchor(recordId, DIGEST, CID);
    await expect(reg.connect(submitter).anchor(recordId, DIGEST, CID))
      .to.be.revertedWithCustomError(reg, "AlreadyAnchored");
  });

  it("rejects verification from an account without VERIFIER", async function () {
    await reg.connect(submitter).anchor(recordId, DIGEST, CID);
    await expect(reg.connect(outsider).verify(recordId))
      .to.be.revertedWithCustomError(reg, "NotAuthorized");
  });

  it("rejects self-verification", async function () {
    await reg.grantRole(VERIFIER, submitter.address);
    await reg.connect(submitter).anchor(recordId, DIGEST, CID);
    await expect(reg.connect(submitter).verify(recordId))
      .to.be.revertedWithCustomError(reg, "SelfVerification");
  });

  it("rejects verification of an unknown record", async function () {
    await expect(reg.connect(verifier).verify(recordId))
      .to.be.revertedWithCustomError(reg, "UnknownRecord");
  });

  it("records the verifier and time on success", async function () {
    await reg.connect(submitter).anchor(recordId, DIGEST, CID);
    await expect(reg.connect(verifier).verify(recordId))
      .to.emit(reg, "RecordVerified");

    const r = await reg.get(recordId);
    expect(r.verifier).to.equal(verifier.address);
    expect(r.verifiedAt).to.be.greaterThan(0n);
  });

  it("rejects a revoked submitter", async function () {
    await reg.revokeRole(SUBMITTER, submitter.address);
    await expect(reg.connect(submitter).anchor(recordId, DIGEST, CID))
      .to.be.revertedWithCustomError(reg, "NotAuthorized");
  });
});
