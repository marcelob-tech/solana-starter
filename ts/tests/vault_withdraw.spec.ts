import { expect } from "chai";

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("vault_withdraw.ts", () => {
  it("success path builds Withdraw SOL instruction (discriminant=2) and sends tx", async () => {
    jest.resetModules();

    let capturedTx: any;
    const sendMock = jest.fn(async (_connection: any, tx: any) => {
      capturedTx = tx;
      return "sig";
    });

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        sendAndConfirmTransaction: sendMock,
      };
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    jest.isolateModules(() => {
      require("../cluster1/vault_withdraw");
    });

    await flushMicrotasks();

    expect(sendMock.mock.calls.length).to.eq(1);
    expect(capturedTx.instructions).to.have.length(1);

    const ix = capturedTx.instructions[0];
    expect(ix.data[0]).to.eq(2);

    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("error path logs error when send fails", async () => {
    jest.resetModules();

    const sendMock = jest.fn(async () => {
      throw new Error("boom");
    });

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        sendAndConfirmTransaction: sendMock,
      };
    });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    jest.isolateModules(() => {
      require("../cluster1/vault_withdraw");
    });

    await flushMicrotasks();

    expect(sendMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(1);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Oops, something went wrong");

    errSpy.mockRestore();
  });
});
