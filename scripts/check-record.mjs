import "dotenv/config";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.DIDLAB_RPC_URL);

const contract = new ethers.Contract(
  "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39",
  ["function get(bytes32) view returns (tuple(bytes32 digest, string cid, address submitter, uint64 submittedAt, address verifier, uint64 verifiedAt))"],
  provider
);

const recordId = ethers.id("counter-sol-record-001");
const record = await contract.get(recordId);

console.log("Record ID:", recordId);
console.log("Digest:", record.digest);
console.log("CID:", record.cid);
console.log("Submitter:", record.submitter);
console.log("Submitted at:", record.submittedAt.toString());
console.log("Verifier:", record.verifier);
console.log("Verified at:", record.verifiedAt.toString());
