
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.5/ethers.min.js";
import { COUNTER_ABI } from "./abi.js";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "./registry-abi.js";

const CONTRACT_ADDRESS = "0x1f875D56D85Ef2594Aa32048B491d8845125a1d4";
const DEPLOYMENT_TX =
  "0x242ef310fe9d9953147c9da62661d2845a3bbb830a13d75f3db18df04f3fb256";

const DIDLAB_CHAIN_ID = 252501n;
const POLL_INTERVAL_MS = 4000;
const CHUNK_SIZE = 1000;

const networkText = document.getElementById("network");
const accountText = document.getElementById("account");
const stateText = document.getElementById("state");
const statusText = document.getElementById("status");
const connectButton = document.getElementById("connect");
const incrementButton = document.getElementById("increment");
const decrementButton = document.getElementById("decrement");
const eventsList = document.getElementById("events");

const registryStatus = document.getElementById("registry-status");
const roleText = document.getElementById("role");
const anchorPanel = document.getElementById("anchor-panel");
const verifyPanel = document.getElementById("verify-panel");

let provider;
let contract;
let registryWrite = null;
let registryBusy = false;
let lastScannedBlock = null;
let polling = false;
let transactionPending = false;

const publicProvider = new ethers.JsonRpcProvider(
  "https://eth.didlab.org"
);

const publicContract = new ethers.Contract(
  CONTRACT_ADDRESS,
  COUNTER_ABI,
  publicProvider
);

const registryRead = new ethers.Contract(
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  publicProvider
);

const recordId = ethers.id("counter-sol-record-001");

document.getElementById("registry-address").textContent = REGISTRY_ADDRESS;
document.getElementById("record-id").textContent = recordId;

// Read the Counter contract.
async function readCount() {
  try {
    const count = await publicContract.getCount();
    stateText.textContent = `Count: ${count.toString()}`;
  } catch (error) {
    stateText.textContent = "Could not read the counter.";
    console.error("Read count failed:", error);
  }
}

// Display network and block number.
async function checkNetwork() {
  try {
    const network = await publicProvider.getNetwork();
    const block = await publicProvider.getBlockNumber();

    networkText.textContent =
      `Network: DIDLab (${network.chainId}) - Block ${block}`;

    if (network.chainId !== DIDLAB_CHAIN_ID) {
      networkText.textContent = "RPC returned the wrong network.";
    }
  } catch (error) {
    networkText.textContent = "Could not connect to DIDLab RPC.";
    console.error("Network check failed:", error);
  }
}

// Display Counter events.
function displayEvent(event) {
  if (
    eventsList.children.length === 1 &&
    eventsList.firstElementChild.textContent ===
      "No CountChanged events found yet."
  ) {
    eventsList.innerHTML = "";
  }

  const item = document.createElement("li");

  item.textContent =
    `Count changed to ${event.args.newCount.toString()} ` +
    `by ${event.args.changedBy} ` +
    `(block ${event.blockNumber})`;

  eventsList.prepend(item);
}

// Load historical Counter events.
async function loadRecentEvents() {
  try {
    const receipt = await publicProvider.getTransactionReceipt(
      DEPLOYMENT_TX
    );

    if (!receipt) {
      throw new Error("Counter deployment receipt was not found.");
    }

    const deploymentBlock = receipt.blockNumber;
    const latestBlock = await publicProvider.getBlockNumber();
    const events = [];

    for (
      let fromBlock = deploymentBlock;
      fromBlock <= latestBlock;
      fromBlock += CHUNK_SIZE
    ) {
      const toBlock = Math.min(
        fromBlock + CHUNK_SIZE - 1,
        latestBlock
      );

      const chunkEvents = await publicContract.queryFilter(
        publicContract.filters.CountChanged(),
        fromBlock,
        toBlock
      );

      events.push(...chunkEvents);
    }

    eventsList.innerHTML = "";
    events.reverse();

    for (const event of events) {
      const item = document.createElement("li");

      item.textContent =
        `Count changed to ${event.args.newCount.toString()} ` +
        `by ${event.args.changedBy} ` +
        `(block ${event.blockNumber})`;

      eventsList.appendChild(item);
    }

    if (events.length === 0) {
      const item = document.createElement("li");
      item.textContent = "No CountChanged events found yet.";
      eventsList.appendChild(item);
    }

    lastScannedBlock = latestBlock;
  } catch (error) {
    console.error("Could not load historical events:", error);
    statusText.textContent =
      "Could not load activity. Check the console.";
  }
}

// Poll for new Counter events.
async function pollForEvents() {
  if (polling) return;

  polling = true;

  try {
    const latestBlock = await publicProvider.getBlockNumber();

    if (
      lastScannedBlock !== null &&
      latestBlock > lastScannedBlock
    ) {
      const newEvents = [];

      for (
        let fromBlock = lastScannedBlock + 1;
        fromBlock <= latestBlock;
        fromBlock += CHUNK_SIZE
      ) {
        const toBlock = Math.min(
          fromBlock + CHUNK_SIZE - 1,
          latestBlock
        );

        const chunkEvents = await publicContract.queryFilter(
          publicContract.filters.CountChanged(),
          fromBlock,
          toBlock
        );

        newEvents.push(...chunkEvents);
      }

      lastScannedBlock = latestBlock;

      if (newEvents.length > 0) {
        for (const event of newEvents) {
          displayEvent(event);
        }

        await readCount();

        statusText.textContent =
          "Blockchain event received; state refreshed.";
      }
    }
  } catch (error) {
    console.error("Event polling failed:", error);
  } finally {
    polling = false;
    setTimeout(pollForEvents, POLL_INTERVAL_MS);
  }
}

// Enable or disable Counter buttons.
function updateTransactionButtons() {
  const disabled = !contract || transactionPending;

  incrementButton.disabled = disabled;
  decrementButton.disabled = disabled;
}

// Read the anchored record from the blockchain.
async function refreshRecord() {
  try {
    const record = await registryRead.get(recordId);

    document.getElementById("record-digest").textContent =
      record.digest;

    document.getElementById("record-submitter").textContent =
      record.submitter;

    const cidLink = document.getElementById("record-cid");

    cidLink.textContent = record.cid;

    cidLink.href =
      "https://gateway.didlab.org/ipfs/" +
      encodeURIComponent(record.cid);

    document.getElementById("record-verification").textContent =
      record.verifiedAt > 0n
        ? `Verified by ${record.verifier}`
        : "Not verified";
  } catch (error) {
    registryStatus.textContent =
      "Could not load registry record.";

    console.error("Record read failed:", error);
  }
}

// Check the connected wallet's roles.
async function refreshRole() {
  anchorPanel.hidden = true;
  verifyPanel.hidden = true;
  registryWrite = null;

  if (!provider) {
    roleText.textContent = "Role: connect your wallet";
    return;
  }

  const network = await provider.getNetwork();

  if (network.chainId !== DIDLAB_CHAIN_ID) {
    roleText.textContent = "Role: wrong network";
    return;
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  const [submitterRole, verifierRole] = await Promise.all([
    registryRead.SUBMITTER(),
    registryRead.VERIFIER()
  ]);

  const [canSubmit, canVerify] = await Promise.all([
    registryRead.hasRole(submitterRole, address),
    registryRead.hasRole(verifierRole, address)
  ]);

  registryWrite = new ethers.Contract(
    REGISTRY_ADDRESS,
    REGISTRY_ABI,
    signer
  );

  anchorPanel.hidden = !canSubmit;
  verifyPanel.hidden = !canVerify;

  roleText.textContent =
    canSubmit && canVerify ? "Role: submitter + verifier" :
    canSubmit ? "Role: submitter" :
    canVerify ? "Role: verifier" :
    "Role: no role on this registry";

  registryStatus.textContent = "Registry ready.";
}

// Connect MetaMask.
async function connectWallet() {
  try {
    if (!window.ethereum) {
      statusText.textContent = "MetaMask was not detected.";
      return;
    }

    provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send(
      "eth_requestAccounts",
      []
    );

    if (accounts.length === 0) {
      statusText.textContent = "No wallet account was selected.";
      return;
    }

    const network = await provider.getNetwork();

    if (network.chainId !== DIDLAB_CHAIN_ID) {
      networkText.textContent =
        "Wrong network. Please switch MetaMask to DIDLab.";

      statusText.textContent =
        "Switch to DIDLab and try again.";

      return;
    }

    const signer = await provider.getSigner();

    contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      COUNTER_ABI,
      signer
    );

    accountText.textContent = `Wallet: ${accounts[0]}`;
    statusText.textContent = "Wallet connected.";

    updateTransactionButtons();

    // Detect roles after wallet connection finishes.
    await refreshRole();

  } catch (error) {
    statusText.textContent =
      `Connection failed: ${error.shortMessage || error.message}`;

    console.error("Wallet connection failed:", error);
  }
}

// Submit Counter transactions.
async function submitCounterTransaction(method, label) {
  if (!contract || transactionPending) {
    statusText.textContent = "Connect your wallet first.";
    return;
  }

  transactionPending = true;
  updateTransactionButtons();

  try {
    statusText.textContent =
      `Simulating ${label.toLowerCase()}...`;

    await contract[method].staticCall();

    statusText.textContent =
      "Awaiting MetaMask signature...";

    const transaction = await contract[method]();

    statusText.textContent = `Pending: ${transaction.hash}`;

    const receipt = await transaction.wait();

    if (receipt.status === 1) {
      statusText.textContent =
        `Transaction confirmed in block ${receipt.blockNumber}. Waiting for event...`;
    } else {
      statusText.textContent =
        "Transaction reverted on-chain.";
    }

  } catch (error) {
    if (
      error.code === 4001 ||
      error.code === "ACTION_REJECTED"
    ) {
      statusText.textContent =
        "Cancelled: you rejected the wallet request.";
    } else {
      statusText.textContent =
        `Transaction failed: ${
          error.shortMessage || error.reason || error.message
        }`;
    }

    console.error(`${label} failed:`, error);

  } finally {
    transactionPending = false;
    updateTransactionButtons();
  }
}

// Submit AnchorRegistry transactions.
async function submitRegistryTransaction(method, args) {
  if (!registryWrite || registryBusy) return;

  registryBusy = true;

  try {
    registryStatus.textContent =
      "Simulating transaction...";

    await registryWrite[method].staticCall(...args);

    registryStatus.textContent =
      "Awaiting MetaMask signature...";

    const tx = await registryWrite[method](...args);

    registryStatus.textContent =
      `Pending: ${tx.hash}`;

    await tx.wait();

    registryStatus.textContent =
      `Confirmed: ${tx.hash}`;

    await refreshRecord();

  } catch (error) {
    registryStatus.textContent =
      `Transaction rejected: ${
        error.revert?.name ||
        error.shortMessage ||
        error.message
      }`;

  } finally {
    registryBusy = false;
  }
}

// Connect wallet button.
connectButton.addEventListener("click", connectWallet);

// Counter buttons.
incrementButton.addEventListener("click", () => {
  submitCounterTransaction("increment", "Increment");
});

decrementButton.addEventListener("click", () => {
  submitCounterTransaction("decrement", "Decrement");
});

// Anchor button.
document.getElementById("anchor-button").addEventListener(
  "click",
  () => {
    const id = document.getElementById("anchor-id").value.trim();
    const digest = document.getElementById("anchor-digest").value.trim();
    const cid = document.getElementById("anchor-cid").value.trim();

    if (!id || !ethers.isHexString(digest, 32) || !cid) {
      registryStatus.textContent =
        "Enter a record ID, valid SHA-256 digest, and CID.";
      return;
    }

    submitRegistryTransaction(
      "anchor",
      [ethers.id(id), digest, cid]
    );
  }
);

// Verify button.
document.getElementById("verify-button").addEventListener(
  "click",
  () => {
    const id = document.getElementById("verify-id").value.trim();

    if (!id) {
      registryStatus.textContent =
        "Enter a record ID.";
      return;
    }

    submitRegistryTransaction(
      "verify",
      [ethers.id(id)]
    );
  }
);

// Reset wallet-specific controls when accounts change.
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => {
    contract = null;
    provider = null;
    registryWrite = null;

    accountText.textContent =
      "Wallet: reconnect required";

    roleText.textContent =
      "Role: connect your wallet";

    anchorPanel.hidden = true;
    verifyPanel.hidden = true;

    updateTransactionButtons();
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}

// Initialize website.
async function initialize() {
  await checkNetwork();
  await readCount();
  await refreshRecord();
  await loadRecentEvents();
  pollForEvents();
}

initialize();
