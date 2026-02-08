import { expect } from "chai";

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("vault_deposit_spl.ts", () => {
  it("builds Deposit SPL instruction (discriminant=3) and sends tx", async () => {
    jest.resetModules();

    const { PublicKey } = jest.requireActual("@solana/web3.js");

    let capturedTx: any;
    const sendMock = jest.fn(async (_connection: any, tx: any) => {
      capturedTx = tx;
      return "sig";
    });

    const ataMock = jest.fn(async () => ({
      address: new PublicKey("11111111111111111111111111111111"),
    }));

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
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

    jest.isolateModules(() => {
      require("../cluster1/vault_deposit_spl");
    });

    await flushMicrotasks();

    expect(ataMock.mock.calls.length).to.eq(2);
    expect(sendMock.mock.calls.length).to.eq(1);

    const ix = capturedTx.instructions[0];
    expect(ix.data[0]).to.eq(3);

    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("logs error when ATA fetch fails", async () => {
    jest.resetModules();

    const sendMock = jest.fn(async () => "sig");
    const ataMock = jest.fn(async () => {
      throw new Error("no ata");
    });

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
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

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    jest.isolateModules(() => {
      require("../cluster1/vault_deposit_spl");
    });

    await flushMicrotasks();

    expect(ataMock.mock.calls.length).to.eq(1);
    expect(sendMock.mock.calls.length).to.eq(0);
    expect(errSpy.mock.calls.length).to.eq(1);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Oops, something went wrong");

    errSpy.mockRestore();
  });
});
