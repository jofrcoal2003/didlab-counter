import { ethers } from "ethers";

const errors = [
  "NotAuthorized(bytes32)",
  "EmptyDigest()",
  "AlreadyAnchored()",
  "UnknownRecord()",
  "AlreadyVerified()",
  "SelfVerification()"
];

for (const name of errors) {
  console.log(name, ethers.id(name).slice(0, 10));
}
