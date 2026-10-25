import "dotenv/config";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39";

const CID = "QmTmSPPWdd8UuwAZE2upQYfMpp57s2Ngb2ZyWMAmBBDiT9";

const DIGEST = "0xad4b205e28112abc6c07885172210f076fa702d1f0ec89e0a8be7683e6096103";

// Create a unique, non-personal record identifier.
const RECORD_ID = ethers.id("counter-sol-record-001");

const provider = new ethers.JsonRpcProvider(process.env.DIDLAB_RPC_URL);
const wallet = new ethers.Wallet(process.env.DIDLAB_PRIVATE_KEY, provider);

const abi = [
  "function anchor(bytes32 recordId, bytes32 digest, string cid)",
  "function get(bytes32 recordId) view returns (tuple(bytes32 digest, string cid, address submitter, uint64 submittedAt, address verifier, uint64 verifiedAt))"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

if ((await provider.getNetwork()).chainId !== 252501n) {
  throw new Error("Wrong network");
}

console.log("Record ID:", RECORD_ID);
console.log("CID:", CID);
console.log("Digest:", DIGEST);

const tx = await contract.anchor(RECORD_ID, DIGEST, CID);

console.log("Transaction:", tx.hash);

await tx.wait();

const record = await contract.get(RECORD_ID);

console.log("Anchored successfully!");
console.log("Stored digest:", record.digest);
console.log("Stored CID:", record.cid);
console.log("Submitter:", record.submitter);
console.log("Submitted at:", record.submittedAt.toString());
