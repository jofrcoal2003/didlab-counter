
import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.DIDLAB_RPC_URL);
const wallet = new ethers.Wallet(process.env.DIDLAB_PRIVATE_KEY, provider);

const contract = new ethers.Contract(
  "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39",
  [
    "function anchor(bytes32,bytes32,string)",
    "function verify(bytes32)",
    "error SelfVerification()"
  ],
  wallet
);

const recordId = ethers.id("self-verification-test-001");
const digest = ethers.id("test-content");

const tx = await contract.anchor(recordId, digest, "test-cid");
await tx.wait();

console.log("Test record anchored:", tx.hash);

try {
  await contract.verify.staticCall(recordId);
  console.log("FAILED: Self-verification was allowed");
} catch (error) {
  console.log("Verification rejected.");
  console.log("Reason:", error.revert?.name ?? error.shortMessage);
}
