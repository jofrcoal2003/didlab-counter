
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.5/ethers.min.js";
import { COUNTER_ABI } from "./abi.js";

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

let provider;
let contract;
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

// Read current state directly from DIDLab.
async function readCount() {
  try {
    const count = await publicContract.getCount();
    stateText.textContent = `Count: ${count.toString()}`;
  } catch (error) {
    stateText.textContent = "Could not read the counter.";
    console.error("Read count failed:", error);
  }
}

// Display network and current block number.
async function checkNetwork() {
  try {
    const network = await publicProvider.getNetwork();
    const block = await publicProvider.getBlockNumber();

    networkText.textContent =
      `Network: DIDLab (${network.chainId}) · Block ${block}`;

    if (network.chainId !== DIDLAB_CHAIN_ID) {
      networkText.textContent = "RPC returned the wrong network.";
    }
  } catch (error) {
    networkText.textContent = "Could not connect to DIDLab RPC.";
    console.error("Network check failed:", error);
  }
}

// Add one event to the top of the activity list.
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

// Load historical events from the contract deployment onward.
async function loadRecentEvents() {
  try {
    const receipt = await publicProvider.getTransactionReceipt(
      DEPLOYMENT_TX
    );

    if (!receipt) {
      throw new Error("V2 deployment receipt was not found.");
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

    console.log(
      `Loaded ${events.length} historical events through block ${latestBlock}.`
    );
  } catch (error) {
    console.error("Could not load historical events:", error);
    statusText.textContent =
      "Could not load activity. Check the console.";
  }
}

// Search newly produced blocks for counter events.
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

      // Advance only after all queries succeeded.
      lastScannedBlock = latestBlock;

      if (newEvents.length > 0) {
        for (const event of newEvents) {
          console.log("New blockchain event:", {
            count: event.args.newCount.toString(),
            changedBy: event.args.changedBy,
            block: event.blockNumber
          });

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

// Enable or disable both transaction buttons together.
function updateTransactionButtons() {
  const disabled = !contract || transactionPending;
  incrementButton.disabled = disabled;
  decrementButton.disabled = disabled;
}

// Connect MetaMask and check the network.
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
      statusText.textContent = "Switch to DIDLab and try again.";
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
  } catch (error) {
    statusText.textContent =
      `Connection failed: ${error.shortMessage || error.message}`;

    console.error("Wallet connection failed:", error);
  }
}

// Use the same transaction workflow for increment and decrement.
async function submitCounterTransaction(method, label) {
  if (!contract || transactionPending) {
    statusText.textContent = "Connect your wallet first.";
    return;
  }

  transactionPending = true;
  updateTransactionButtons();

  try {
    statusText.textContent = `Simulating ${label.toLowerCase()}...`;

    // Simulate before asking MetaMask to sign.
    await contract[method].staticCall();

    statusText.textContent = "Awaiting MetaMask signature...";

    const transaction = await contract[method]();

    statusText.textContent = `Pending: ${transaction.hash}`;

    const receipt = await transaction.wait();

    if (receipt.status === 1) {
      statusText.textContent =
        `Transaction confirmed in block ${receipt.blockNumber}. Waiting for event...`;
      // Do not read state here. The event poller refreshes it.
    } else {
      statusText.textContent = "Transaction reverted on-chain.";
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

connectButton.addEventListener("click", connectWallet);

incrementButton.addEventListener("click", () => {
  submitCounterTransaction("increment", "Increment");
});

decrementButton.addEventListener("click", () => {
  submitCounterTransaction("decrement", "Decrement");
});

// Initialize public reads and historical activity.
async function initialize() {
  await checkNetwork();
  await readCount();
  await loadRecentEvents();
  pollForEvents();
}

initialize();
