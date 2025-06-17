require("dotenv").config();
const { ethers } = require("ethers");

const HLS_ADDRESS = "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517"; // Helios HLS
const VAULT_ADDRESS = process.env.VAULT_ADDRESS;

async function main() {
  if (!process.env.PRIVATE_KEY || !process.env.PRIVATE_KEY.startsWith("0x")) {
    throw new Error("❌ PRIVATE_KEY must be a hex string starting with 0x");
  }

  const provider = new ethers.JsonRpcProvider(process.env.HELIOS_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("🔐 Using address:", wallet.address);

  const vaultAbi = [
    "function lock(address token, uint amount) external",
    "function release(address token, address to, uint amount) external",
  ];

  const erc20Abi = [
    "function approve(address spender, uint amount) public returns (bool)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint)"
  ];

  const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, wallet);
  const token = new ethers.Contract(HLS_ADDRESS, erc20Abi, wallet);

  const decimals = await token.decimals();
  const min = parseFloat(process.env.BRIDGE_MIN || "1");
  const max = parseFloat(process.env.BRIDGE_MAX || "3");
  const randomAmount = (Math.random() * (max - min) + min).toFixed(2);
  const amount = ethers.parseUnits(randomAmount, decimals);
  console.log(`🔁 Bridging ${randomAmount} HLS...`);

  console.log("🔐 Approving token...");
  await token.approve(VAULT_ADDRESS, amount);

  const balance = await token.balanceOf(wallet.address);
  console.log("🔎 Your HLS balance:", ethers.formatUnits(balance, decimals));
  if (balance < amount) throw new Error("❌ Not enough HLS to bridge.");

  const approveTx = await token.approve(VAULT_ADDRESS, amount);
  await approveTx.wait();
  console.log("✅ Approval confirmed. Proceeding to lock...");

  console.log("🔁 Locking tokens into bridge...");
  const tx = await vault.lock(HLS_ADDRESS, amount);
  const receipt = await tx.wait();

  const explorer = "https://explorer.helioschainlabs.org/tx/";
  console.log(`✅ Bridged! Tx: ${explorer}${receipt.hash}`);
}

main().catch(console.error);
