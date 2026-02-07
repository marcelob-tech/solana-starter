use solana_idlgen::idlgen;

idlgen!({
  "version": "0.1.0",
  "name": "wba_vault",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "vaultState", "isMut": true, "isSigner": true },
        { "name": "vaultAuth", "isMut": false, "isSigner": false },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "deposit",
      "accounts": [
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "vaultState", "isMut": true, "isSigner": false },
        { "name": "vaultAuth", "isMut": false, "isSigner": false },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "vaultState", "isMut": true, "isSigner": false },
        { "name": "vaultAuth", "isMut": false, "isSigner": false },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Vault",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "authBump", "type": "u8" },
          { "name": "vaultBump", "type": "u8" },
          { "name": "score", "type": "u8" }
        ]
      }
    }
  ],
  "metadata": {
    "address": "DuvfyNrCiUmMsjNbaXPJsR755S2uJ8MkRX9etewz4wdi"
  }
});
