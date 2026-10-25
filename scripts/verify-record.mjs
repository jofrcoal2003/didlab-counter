
import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.DIDLAB_RPC_URL);

const wallet = new ethers.Wallet(
  process.env.DIDLAB_VERIFIER_PRIVATE_KEY,
  provider
);

const contract = new ethers.Contract(
  "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39",
  [
    "function verify(bytes32 recordId)",
    "function get(bytes32 recordId) view returns (tuple(bytes32 digest, string cid, address submitter, uint64 submittedAt, address verifier, uint64 verifiedAt))"
  ],
  wallet
);

if ((await provider.getNetwork()).chainId !== 252501n) {
  throw new Error("Wrong network");
}

const recordId = ethers.id("counter-sol-record-001");

console.log("Verifier wallet:", wallet.address);

const tx = await contract.verify(recordId);
console.log("Transaction:", tx.hash);

await tx.wait();

const record = await contract.get(recordId);

console.log("Verified successfully!");
console.log("Verifier:", record.verifier);
console.log("Verified at:", record.verifiedAt.toString());
