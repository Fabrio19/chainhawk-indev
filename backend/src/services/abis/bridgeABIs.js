/**
 * Real Bridge Contract ABIs - Updated for Active Bridges Only
 * Removed Multichain (defunct) and added Celer cBridge
 */

const STARGATE_ABI = [
  // SendMsg - Stargate Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "dstChainId", type: "uint16" },
      { indexed: false, name: "nonce", type: "uint256" },
      { indexed: false, name: "qty", type: "uint256" },
      { indexed: false, name: "token", type: "address" },
      { indexed: false, name: "amountSD", type: "uint256" },
      { indexed: false, name: "amountLD", type: "uint256" },
      { indexed: false, name: "protocolFee", type: "uint256" },
      { indexed: false, name: "caller", type: "address" },
      { indexed: false, name: "to", type: "address" },
    ],
    name: "SendMsg",
    type: "event",
  },
  // ReceiveMsg - Stargate Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "srcChainId", type: "uint16" },
      { indexed: false, name: "nonce", type: "uint256" },
      { indexed: false, name: "qty", type: "uint256" },
      { indexed: false, name: "token", type: "address" },
      { indexed: false, name: "amountSD", type: "uint256" },
      { indexed: false, name: "amountLD", type: "uint256" },
      { indexed: false, name: "protocolFee", type: "uint256" },
      { indexed: false, name: "caller", type: "address" },
      { indexed: false, name: "to", type: "address" },
    ],
    name: "ReceiveMsg",
    type: "event",
  },
  // Swap - Stargate Pool
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "poolId", type: "uint16" },
      { indexed: false, name: "token", type: "address" },
      { indexed: false, name: "amountLD", type: "uint256" },
      { indexed: false, name: "amountSD", type: "uint256" },
      { indexed: false, name: "amountLP", type: "uint256" },
      { indexed: false, name: "protocolFee", type: "uint256" },
      { indexed: false, name: "caller", type: "address" },
      { indexed: false, name: "data", type: "bytes" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "Swap",
    type: "event",
  },
];

const WORMHOLE_ABI = [
  // LogMessagePublished - Wormhole Core Bridge
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "emitterChainId", type: "uint16" },
      { indexed: true, name: "sequence", type: "uint64" },
      { indexed: false, name: "consistencyLevel", type: "uint8" },
      { indexed: false, name: "payload", type: "bytes" },
    ],
    name: "LogMessagePublished",
    type: "event",
  },
  // TransferTokens - Portal Bridge
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "amount", type: "uint256" },
      { indexed: true, name: "recipientChain", type: "uint16" },
      { indexed: true, name: "recipient", type: "bytes32" },
      { indexed: false, name: "arbiterFee", type: "uint256" },
      { indexed: false, name: "nonce", type: "uint256" },
    ],
    name: "TransferTokens",
    type: "event",
  },
  // TransferTokensWithPayload - Portal Bridge
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "amount", type: "uint256" },
      { indexed: true, name: "recipientChain", type: "uint16" },
      { indexed: true, name: "recipient", type: "bytes32" },
      { indexed: false, name: "fee", type: "uint256" },
      { indexed: false, name: "nonce", type: "uint256" },
    ],
    name: "TransferTokensWithPayload",
    type: "event",
  },
  // Redeem - Portal Bridge
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "amount", type: "uint256" },
      { indexed: true, name: "recipientChain", type: "uint16" },
      { indexed: true, name: "recipient", type: "bytes32" },
      { indexed: false, name: "fee", type: "uint256" },
      { indexed: false, name: "nonce", type: "uint256" },
    ],
    name: "Redeem",
    type: "event",
  },
];

const SYNAPSE_ABI = [
  // TokenSwap - Synapse Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "swapToken", type: "address" },
      { indexed: false, name: "swapAmount", type: "uint256" },
      { indexed: true, name: "toChainId", type: "uint256" },
    ],
    name: "TokenSwap",
    type: "event",
  },
  // TokenRedeem - Synapse Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "swapToken", type: "address" },
      { indexed: false, name: "swapAmount", type: "uint256" },
      { indexed: true, name: "toChainId", type: "uint256" },
    ],
    name: "TokenRedeem",
    type: "event",
  },
  // TokenDeposit - Synapse Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "toChainId", type: "uint256" },
    ],
    name: "TokenDeposit",
    type: "event",
  },
  // TokenRedeemAndSwap - Synapse Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "fromChainId", type: "uint256" },
    ],
    name: "TokenRedeemAndSwap",
    type: "event",
  },
  // TokenRedeemAndRemove - Synapse Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "fromChainId", type: "uint256" },
    ],
    name: "TokenRedeemAndRemove",
    type: "event",
  },
];

const CELER_ABI = [
  // Send - cBridge Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "receiver", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "dstChainId", type: "uint64" },
      { indexed: false, name: "nonce", type: "uint64" },
      { indexed: false, name: "maxSlippage", type: "uint32" },
    ],
    name: "Send",
    type: "event",
  },
  // Relay - cBridge Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "receiver", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "srcChainId", type: "uint64" },
      { indexed: false, name: "srcTransferId", type: "bytes32" },
    ],
    name: "Relay",
    type: "event",
  },
  // Receive - cBridge Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "receiver", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "srcChainId", type: "uint64" },
      { indexed: false, name: "srcTransferId", type: "bytes32" },
    ],
    name: "Receive",
    type: "event",
  },
  // Transfer - cBridge Router
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "receiver", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: true, name: "dstChainId", type: "uint64" },
      { indexed: false, name: "nonce", type: "uint64" },
    ],
    name: "Transfer",
    type: "event",
  },
];

// Common ERC20 functions for token symbol lookup
const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
];

module.exports = {
  STARGATE_ABI,
  WORMHOLE_ABI,
  SYNAPSE_ABI,
  CELER_ABI,
  ERC20_ABI,
}; 