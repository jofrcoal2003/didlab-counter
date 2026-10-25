
export const REGISTRY_ADDRESS =
  "0x8C7dd203A5657D3dD8EbF8a0A409f9Ed514c7E39";

export const REGISTRY_ABI = [
  "function SUBMITTER() view returns (bytes32)",
  "function VERIFIER() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function anchor(bytes32 recordId, bytes32 digest, string cid)",
  "function verify(bytes32 recordId)",
  "function get(bytes32 recordId) view returns (tuple(bytes32 digest, string cid, address submitter, uint64 submittedAt, address verifier, uint64 verifiedAt))",
  "error NotAuthorized(bytes32 role)",
  "error EmptyDigest()",
  "error AlreadyAnchored()",
  "error UnknownRecord()",
  "error AlreadyVerified()",
  "error SelfVerification()"
];
