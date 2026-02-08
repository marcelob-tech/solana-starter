import { expect } from "chai";

async function flushMicrotasks(times = 20) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function makeParsedTokenAccount(mint: string, amount: string, decimals: number) {
  return {
    pubkey: { toBase58: () => "TokenAccount111111111111111111111111111111" },
    account: {
      data: {
        parsed: {
          info: {
            mint,
            tokenAmount: {
              amount,
              decimals,
              uiAmountString: amount,
            },
          },
        },
      },
    },
  };
}

describe("vault_close_workflow.ts", () => {
  it("mode=inspect prints vault summary and does not send tx", async () => {
    jest.resetModules();

    const { PublicKey } = jest.requireActual("@solana/web3.js");

    const sendMock = jest.fn(async () => "sig");

    const connectionInstance: any = {
      getBalance: jest.fn(async () => 123),
      getParsedTokenAccountsByOwner: jest.fn(async () => ({ value: [] })),
    };

    const ConnectionMock = jest.fn(() => connectionInstance);

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        Connection: ConnectionMock,
        sendAndConfirmTransaction: sendMock,
      };
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const oldArgv = process.argv;
    process.argv = [
      oldArgv[0],
      oldArgv[1],
      new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG").toBase58(),
      "inspect",
    ];

    jest.isolateModules(() => {
      require("../cluster1/vault_close_workflow");
    });

    await flushMicrotasks();

    expect(ConnectionMock.mock.calls.length).to.eq(1);
    expect(connectionInstance.getBalance.mock.calls.length).to.eq(1);
    expect(connectionInstance.getParsedTokenAccountsByOwner.mock.calls.length).to.eq(1);
    expect(sendMock.mock.calls.length).to.eq(0);

    process.argv = oldArgv;
    logSpy.mockRestore();
  });

  it("mode=inspect prints token accounts when present", async () => {
    jest.resetModules();

    const { PublicKey } = jest.requireActual("@solana/web3.js");

    const sendMock = jest.fn(async () => "sig");

    const tokenAccounts = {
      value: [makeParsedTokenAccount(new PublicKey("11111111111111111111111111111111").toBase58(), "1", 0)],
    };

    const connectionInstance: any = {
      getBalance: jest.fn(async () => 0),
      getParsedTokenAccountsByOwner: jest.fn(async () => tokenAccounts),
    };

    const ConnectionMock = jest.fn(() => connectionInstance);

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        Connection: ConnectionMock,
        sendAndConfirmTransaction: sendMock,
      };
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const oldArgv = process.argv;
    process.argv = [
      oldArgv[0],
      oldArgv[1],
      new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG").toBase58(),
      "inspect",
    ];

    jest.isolateModules(() => {
      require("../cluster1/vault_close_workflow");
    });

    await flushMicrotasks();

    expect(sendMock.mock.calls.length).to.eq(0);
    expect(connectionInstance.getParsedTokenAccountsByOwner.mock.calls.length).to.eq(1);

    process.argv = oldArgv;
    logSpy.mockRestore();
  });

  it("mode=withdraw runs withdraw loop but does not close (covers withdrawAmount==0)", async () => {
    jest.resetModules();

    const { PublicKey } = jest.requireActual("@solana/web3.js");

    const sendMock = jest.fn(async () => "sig");

    // Include entries that hit continue branches:
    // - missing tokenAmount.amount
    // - rawAmount == 0
    const tokenAccountsBefore = {
      value: [
        {
          pubkey: { toBase58: () => "TA_missing_amount" },
          account: { data: { parsed: { info: { mint: new PublicKey("11111111111111111111111111111111").toBase58(), tokenAmount: { decimals: 6 } } } } },
        },
        makeParsedTokenAccount(new PublicKey("11111111111111111111111111111111").toBase58(), "0", 6),
      ],
    };

    const tokenAccountsAfter = { value: [] };

    const connectionInstance: any = {
      // vaultLamports == rent -> withdrawAmount becomes 0 in withdraw mode
      getBalance: jest.fn(async () => 890_880),
      getParsedTokenAccountsByOwner: jest
        .fn()
        .mockResolvedValueOnce(tokenAccountsBefore)
        .mockResolvedValueOnce(tokenAccountsAfter),
    };

    const ConnectionMock = jest.fn(() => connectionInstance);

    const ataMock = jest.fn(async () => ({
      address: new PublicKey("11111111111111111111111111111111"),
    }));

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        Connection: ConnectionMock,
        sendAndConfirmTransaction: sendMock,
      };
    });

    jest.doMock("@solana/spl-token", () => {
      const actual = jest.requireActual("@solana/spl-token");
      return {
        ...actual,
        getOrCreateAssociatedTokenAccount: ataMock,
      };
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const oldArgv = process.argv;
    process.argv = [
      oldArgv[0],
      oldArgv[1],
      new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG").toBase58(),
      "withdraw",
    ];

    jest.isolateModules(() => {
      require("../cluster1/vault_close_workflow");
    });

    await flushMicrotasks();

    // No withdraw executed (all rawAmount == 0 or invalid), and SOL withdrawAmount==0 -> no send
    expect(sendMock.mock.calls.length).to.eq(0);
    expect(errSpy.mock.calls.length).to.eq(0);

    process.argv = oldArgv;
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("mode=close withdraws SPL/NFT/SOL then closes vaultState", async () => {
    jest.resetModules();

    const { PublicKey } = jest.requireActual("@solana/web3.js");

    const sendMock = jest.fn(async () => "sig");

    const mintSpl = new PublicKey("GKx8cKAqVA57oMd87YUtUQtLefDxHfVW2g23jR9cDGbS").toBase58();
    const mintNft = new PublicKey("DPSMu4DeRwdjR7mTpKxQp7jxXFAZLf4FxdHsQByFHNFk").toBase58();

    const tokenAccountsBefore = {
      value: [
        makeParsedTokenAccount(mintSpl, "30000", 6),
        makeParsedTokenAccount(mintNft, "1", 0),
        makeParsedTokenAccount(mintSpl, "0", 6),
      ],
    };

    const tokenAccountsAfter = { value: [] };

    const connectionInstance: any = {
      getBalance: jest
        .fn()
        .mockResolvedValueOnce(2_000_000) // before
        .mockResolvedValueOnce(0), // after
      getParsedTokenAccountsByOwner: jest
        .fn()
        .mockResolvedValueOnce(tokenAccountsBefore)
        .mockResolvedValueOnce(tokenAccountsAfter),
    };

    const ConnectionMock = jest.fn(() => connectionInstance);

    const ataMock = jest.fn(async () => ({
      address: new PublicKey("11111111111111111111111111111111"),
    }));

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        Connection: ConnectionMock,
        sendAndConfirmTransaction: sendMock,
      };
    });

    jest.doMock("@solana/spl-token", () => {
      const actual = jest.requireActual("@solana/spl-token");
      return {
        ...actual,
        getOrCreateAssociatedTokenAccount: ataMock,
      };
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const oldArgv = process.argv;
    process.argv = [
      oldArgv[0],
      oldArgv[1],
      new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG").toBase58(),
      "close",
    ];

    jest.isolateModules(() => {
      require("../cluster1/vault_close_workflow");
    });

    await flushMicrotasks();

    // It should send: withdraw SPL + withdraw NFT + withdraw SOL + close vaultState
    expect(sendMock.mock.calls.length).to.eq(4);

    const sentIxs = sendMock.mock.calls.map((c: any[]) => c[1].instructions[0]);
    const discriminants = sentIxs.map((ix: any) => ix.data[0]);

    // Order: withdraw NFT/SPL can vary based on iteration, but must include these.
    expect(discriminants.filter((d: number) => d === 4).length).to.eq(1);
    expect(discriminants.filter((d: number) => d === 6).length).to.eq(1);
    expect(discriminants.filter((d: number) => d === 2).length).to.eq(1);
    expect(discriminants.filter((d: number) => d === 7).length).to.eq(1);

    // ensure no error logged
    expect(errSpy.mock.calls.length).to.eq(0);

    process.argv = oldArgv;
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("mode=close refuses to close when non-zero token balances remain", async () => {
    jest.resetModules();

    const { PublicKey } = jest.requireActual("@solana/web3.js");

    const sendMock = jest.fn(async () => "sig");

    const mintSpl = new PublicKey("GKx8cKAqVA57oMd87YUtUQtLefDxHfVW2g23jR9cDGbS").toBase58();

    // Important: keep BEFORE empty so the withdraw loop doesn't run and crash on BigInt(rawAmountStr).
    const tokenAccountsBefore = { value: [] as any[] };

    // AFTER includes:
    // - one invalid amount to hit BigInt parse catch in nonZeroTokenAccounts filter
    // - one non-zero amount to trigger refusal
    const tokenAccountsAfter = {
      value: [
        // Covers: if (!rawAmountStr) return false;
        {
          pubkey: { toBase58: () => "TA_missing_amount" },
          account: {
            data: {
              parsed: {
                info: {
                  mint: mintSpl,
                  tokenAmount: {
                    decimals: 6,
                  },
                },
              },
            },
          },
        },
        // Covers BigInt parse catch branch inside nonZeroTokenAccounts filter.
        makeParsedTokenAccount(mintSpl, "notanumber", 6),
        // Triggers refusal.
        makeParsedTokenAccount(mintSpl, "1", 6),
      ],
    };

    const connectionInstance: any = {
      getBalance: jest.fn(async () => 0),
      getParsedTokenAccountsByOwner: jest
        .fn()
        .mockResolvedValueOnce(tokenAccountsBefore)
        .mockResolvedValueOnce(tokenAccountsAfter),
    };

    const ConnectionMock = jest.fn(() => connectionInstance);

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        Connection: ConnectionMock,
        sendAndConfirmTransaction: sendMock,
      };
    });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const oldArgv = process.argv;
    process.argv = [
      oldArgv[0],
      oldArgv[1],
      new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG").toBase58(),
      "close",
    ];

    jest.isolateModules(() => {
      require("../cluster1/vault_close_workflow");
    });

    await flushMicrotasks();

    process.argv = oldArgv;

    expect(errSpy.mock.calls.length).to.eq(1);
    expect(String(errSpy.mock.calls[0][0])).to.contain(
      "Vault still has non-zero token balances",
    );

    // Ensure it did NOT send the CloseAccount instruction (discriminant 7)
    const discriminants = sendMock.mock.calls.map((c: any[]) => c[1].instructions[0].data[0]);
    expect(discriminants.includes(7)).to.eq(false);

    errSpy.mockRestore();
  });
  
  it("mode=close refuses to close when non-zero token balances remain", async () => {
    jest.resetModules();

    const { PublicKey } = jest.requireActual("@solana/web3.js");

    const sendMock = jest.fn(async () => "sig");

    const mintSpl = new PublicKey("GKx8cKAqVA57oMd87YUtUQtLefDxHfVW2g23jR9cDGbS").toBase58();

    // Important: keep BEFORE empty so the withdraw loop doesn't run and crash on BigInt(rawAmountStr).
    const tokenAccountsBefore = { value: [] as any[] };

    // AFTER includes:
    // - one invalid amount to hit BigInt parse catch in nonZeroTokenAccounts filter
    // - one non-zero amount to trigger refusal
    const tokenAccountsAfter = {
      value: [
        makeParsedTokenAccount(mintSpl, "notanumber", 6),
        makeParsedTokenAccount(mintSpl, "1", 6),
      ],
    };

    const connectionInstance: any = {
      getBalance: jest.fn(async () => 0),
      getParsedTokenAccountsByOwner: jest
        .fn()
        .mockResolvedValueOnce(tokenAccountsBefore)
        .mockResolvedValueOnce(tokenAccountsAfter),
    };

    const ConnectionMock = jest.fn(() => connectionInstance);

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        Connection: ConnectionMock,
        sendAndConfirmTransaction: sendMock,
      };
    });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const oldArgv = process.argv;
    process.argv = [
      oldArgv[0],
      oldArgv[1],
      new PublicKey("CCNyjjidjwSP1wicGryxp5eXa7mXvs3aNdynbESwnwEG").toBase58(),
      "close",
    ];

    jest.isolateModules(() => {
      require("../cluster1/vault_close_workflow");
    });

    await flushMicrotasks();

    process.argv = oldArgv;

    expect(errSpy.mock.calls.length).to.eq(1);
    expect(String(errSpy.mock.calls[0][0])).to.contain(
      "Vault still has non-zero token balances",
    );

    // Ensure it did NOT send the CloseAccount instruction (discriminant 7)
    const discriminants = sendMock.mock.calls.map((c: any[]) => c[1].instructions[0].data[0]);
    expect(discriminants.includes(7)).to.eq(false);

    errSpy.mockRestore();
  });
});
