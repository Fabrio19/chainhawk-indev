/**
 * Bridge Protocol Configuration - Updated for Active Bridges Only
 * Removed Multichain (defunct) and added Celer cBridge
 */
const BRIDGE_CONFIGS = {
  STARGATE: {
    name: "Stargate (LayerZero)",
    networks: {
      ethereum: {
        contracts: [
          "0x8731d54E9D02c286767d56ac03e8037C07e01e98", // Real Stargate Router
          "0x150f94B44927F078737562f0fcF3C95c01Cc2376", // StargatePool
        ],
        rpc: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      },
      bsc: {
        contracts: [
          "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8", // StargateRouter
        ],
        rpc: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      },
      polygon: {
        contracts: [
          "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd", // StargateRouter
        ],
        rpc: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
      },
      arbitrum: {
        contracts: [
          "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614", // StargateRouter
        ],
        rpc: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      },
      optimism: {
        contracts: [
          "0xB0D502E938ed5f4df2e681fE6E419ff29631d62b", // StargateRouter
        ],
        rpc: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      },
    },
  },
  WORMHOLE: {
    name: "Wormhole (Portal)",
    networks: {
      ethereum: {
        contracts: [
          "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B", // Real Wormhole Core Bridge
          "0x3ee18B2214AFF97000D974cf647E7C347E8fa585", // Portal Bridge
        ],
        rpc: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      },
      bsc: {
        contracts: [
          "0xB6F6D86a8f9879A9c87f643768d9efb38f1D8e94", // Portal Bridge
        ],
        rpc: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      },
      polygon: {
        contracts: [
          "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE", // Portal Bridge
        ],
        rpc: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
      },
      arbitrum: {
        contracts: [
          "0xa321448d90d4e5b0A732867c18eA198e75CAC48E", // Portal Bridge
        ],
        rpc: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      },
      solana: {
        contracts: [
          "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tShHF4ssVQr", // Wormhole Core Bridge
        ],
        rpc: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      },
    },
  },
  SYNAPSE: {
    name: "Synapse Protocol",
    networks: {
      ethereum: {
        contracts: [
          "0x2796317b0fF8538F253012862c06787Adfb8cEb6", // Real Synapse Router
        ],
        rpc: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      },
      bsc: {
        contracts: [
          "0x749F37Df06A36Dc8A7C37C892B39295471C4a9BA", // SynapseRouter
        ],
        rpc: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      },
      polygon: {
        contracts: [
          "0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5", // SynapseRouter
        ],
        rpc: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
      },
      arbitrum: {
        contracts: [
          "0x6f4e8eba4d337f874ab57478acc2cb5bacdc19c9", // SynapseRouter
        ],
        rpc: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      },
      avalanche: {
        contracts: [
          "0xC05e61d0E7a63D27546389B7aD62FdFf5A91aACE", // SynapseRouter
        ],
        rpc: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      },
    },
  },
  CELER: {
    name: "Celer cBridge",
    networks: {
      ethereum: {
        contracts: [
          "0x5427FEFA711Eff984124bFBB1AB6fbf5E3DA1820", // cBridge Router
        ],
        rpc: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      },
      bsc: {
        contracts: [
          "0xdd90E5E87A2081Dcf039192086DdEBAc64C9d3F4", // cBridge Router
        ],
        rpc: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      },
      polygon: {
        contracts: [
          "0x88DCDC47D2f83a99CF0000FDF667A468bB958a78", // cBridge Router
        ],
        rpc: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
      },
      arbitrum: {
        contracts: [
          "0x1619DE6B6B20eD217a58d00f37B9d47C7663feca", // cBridge Router
        ],
        rpc: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      },
      optimism: {
        contracts: [
          "0x9D39Fc627A6d9d9F8C831c16995b209548cc3401", // cBridge Router
        ],
        rpc: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      },
    },
  },
};

/**
 * Bridge Event Types
 */
const BRIDGE_EVENTS = {
  MULTICHAIN: {
    SwapIn: "SwapIn(address,address,uint256,uint256,uint256,uint256)",
    SwapOut: "SwapOut(address,address,uint256,uint256,uint256,uint256)",
    LogAnySwapIn: "LogAnySwapIn(bytes32,address,address,uint256,uint256,uint256)",
    LogAnySwapOut: "LogAnySwapOut(address,address,address,uint256,uint256,uint256)",
  },
  STARGATE: {
    Swap: "Swap(uint16,uint256,uint256,uint256,uint256,uint256,address,bytes,uint256)",
    Send: "Send(uint16,bytes,uint256,address,uint256,uint256,uint256,uint256,uint256)",
    Receive: "Receive(uint16,bytes,uint256,address,uint256,uint256,uint256,uint256,uint256)",
  },
  WORMHOLE: {
    TransferTokens: "TransferTokens(uint16,bytes32,uint256,address,uint256,uint256,uint256,uint256,uint256)",
    Redeem: "Redeem(uint16,bytes32,uint256,address,uint256,uint256,uint256,uint256,uint256)",
  },
  SYNAPSE: {
    TokenSwap: "TokenSwap(address,uint256,address,uint256,address,address)",
    TokenRedeem: "TokenRedeem(address,uint256,address,uint256,uint256,uint256)",
  },
  CELER: {
    Send: "Send(address,address,uint256,uint64,uint64,uint32)",
    Relay: "Relay(address,address,address,uint256,uint64,bytes32)",
    Receive: "Receive(address,address,address,uint256,uint64,bytes32)",
  },
};

module.exports = {
  BRIDGE_CONFIGS,
  BRIDGE_EVENTS,
}; 