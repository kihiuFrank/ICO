const { network, ethers, deployments } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Unit tests for the ICO contract", () => {
          let deployer, ico, accounts
          beforeEach("runs before every test", async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["ico"])

              ico = await ethers.getContract("ICO")
          })

          it("deploys succesfully", async () => {
              assert(ico.address)
          })
      })
