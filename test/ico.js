const { network, ethers, deployments } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../helper-hardhat-config")
const { describe } = require("mocha")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Unit tests for the ICO contract", () => {
          let deployer, ico, accounts, inverstor1
          beforeEach("runs before every test", async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              inverstor1 = accounts[1]
              await deployments.fixture(["ico"])

              ico = await ethers.getContract("ICO")
          })

          it("deploys succesfully", async () => {
              assert(ico.address)
          })

          it("changes state when function is called & only allows manager to call", async () => {
              // only allows manager to call
              const icoInvestor1connected = ico.connect(inverstor1)

              await expect(icoInvestor1connected.halt()).to.be.rejectedWith("not owner")

              await expect(icoInvestor1connected.resume()).to.be.rejectedWith("not owner")

              // changes state to halted
              await ico.halt()
              const haltState = await ico.getState()
              assert.equal(haltState, 3) // state [3] = halted on our ICO.sol

              // changes state to running
              await ico.resume()
              const runningState = await ico.getState()
              assert.equal(runningState, 2) // state [3] = halted on our ICO.sol
          })

          describe("changeDepositAddr func", () => {
              it("only allows manager to call", async () => {
                  const icoInvestor1connected = ico.connect(inverstor1)
                  await expect(icoInvestor1connected.changeDepositAddr()).to.be.rejectedWith(
                      "not owner"
                  )
              })
              it("changes deposit address", async () => {
                  await ico.changeDepositAddr("0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C")

                  assert.equal(
                      await ico.getDepositAddr(),
                      "0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C"
                  )
              })
          })
      })
