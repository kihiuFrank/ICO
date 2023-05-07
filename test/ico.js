const { network, ethers, deployments } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../helper-hardhat-config")

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

          it("changes state to halted & only allows manager to call", async () => {
              // only allows manager to call
              const icoInvestor1connected = ico.connect(inverstor1)
              await expect(icoInvestor1connected.halt()).to.be.rejectedWith("not owner")

              // changes state to halted
              await ico.halt()
              const haltState = await ico.getState()
              assert.equal(haltState, 3) // state [3] = halted on our ICO.sol
          })

          it("changes state to running & only allows manager to call", async () => {
              // only allows manager to call
              const icoInvestor1connected = ico.connect(inverstor1)
              await expect(icoInvestor1connected.resume()).to.be.rejectedWith("not owner")

              // changes state to running
              await ico.resume()
              const runningState = await ico.getState()
              assert.equal(runningState, 2) // state [2] = running on our ICO.sol
          })

          describe("changeDepositAddr func", () => {
              it("only allows manager to call", async () => {
                  const icoInvestor1connected = ico.connect(inverstor1)
                  await expect(
                      icoInvestor1connected.changeDepositAddr(
                          "0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C"
                      )
                  ).to.be.rejectedWith("not owner")
              })
              it("changes deposit address", async () => {
                  await ico.changeDepositAddr("0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C")

                  assert.equal(
                      await ico.getDepositAddr(),
                      "0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C"
                  )
              })
          })

          describe("invest", () => {
              it("checks if ico is running before investing", async () => {
                  // stop the ico
                  await ico.halt()

                  await expect(ico.invest()).to.be.revertedWithCustomError(
                      ico,
                      "Ico__MustBeRunning"
                  )
              })

              it("checks if invested amount is below minimum", async () => {
                  // cannot be below minimum invest amount of 0.1ETH
                  const minValue = ethers.utils.parseEther("0.09")
                  await expect(ico.invest({ value: minValue })).to.be.revertedWithCustomError(
                      ico,
                      "Ico__AmountBelowMimimumAllowed"
                  )
              })

              it("checks if ivested amount is above maximum", async () => {
                  //cannot be above maximum invest amount of 10ETH
                  const maxValue = ethers.utils.parseEther("10.009")
                  await expect(ico.invest({ value: maxValue })).to.be.revertedWithCustomError(
                      ico,
                      "Ico__AmountAboveMaximumAllowed"
                  )
              })

              it("checks that raised amount doesn't exceed set cap", async () => {
                  //const cap = ethers.utils.parseEther("300")
                  const cap = await ico.getCap()

                  //invest
                  const icoInvestor1connected = ico.connect(inverstor1)
                  const investAmount = ethers.utils.parseEther("10")

                  for (let i = 0; i < 30; i++) {
                      await icoInvestor1connected.invest({ value: investAmount })
                  }

                  //get raised amount
                  //const raisedAmount = ethers.utils.parseEther("301")
                  const raisedAmount = await ico.getRaisedAmount()

                  assert.equal(raisedAmount.toString(), "10000000000000000000") // 10^18
                  assert(raisedAmount <= cap)

                  /* // investing to reach cap (31*10 = 310ETH)
                  const investAmount = ethers.utils.parseEther("10")
                  for (let i = 0; i < 30; i++) {
                      await ico.invest({ value: investAmount })
                  } */

                  /* await expect(ico.invest({ value: raisedAmount })).to.be.revertedWithCustomError(
                      ico,
                      "Ico__AmountRaisedCannotExceedCap"
                  ) */
              })

              it("updates balances accordingly", async () => {
                  //invest
                  const icoInvestor1connected = ico.connect(inverstor1)
                  const investAmount = ethers.utils.parseEther("10")

                  await icoInvestor1connected.invest({ value: investAmount })
                  // tokens; 10/0.1 = 100 tokens

                  // checks investor balance
                  assert.equal((await ico.getAddressBalance(inverstor1.address)).toString(), "100")

                  // checks manager balance
                  assert.equal((await ico.getManagerBalance()).toString(), "99900")
              })

              it("invests succesfully", async () => {
                  //invest
                  const icoInvestor1connected = ico.connect(inverstor1)
                  const investAmount = ethers.utils.parseEther("10")

                  //await icoInvestor1connected.invest({ value: investAmount })
                  // tokens; 10/0.1 = 100 tokens

                  // check for emitted event
                  expect(await icoInvestor1connected.invest({ value: investAmount })).to.emit(
                      "Invest"
                  )
              })
          })

          describe("burning tokens", () => {
              it("checks that the ico is ended before burning", async () => {
                  // const icoState = await ico.getState()
                  // assert.equal(icoState, 1) // state [1] = afterEnd on our ICO.sol

                  await expect(ico.burn()).to.be.revertedWithCustomError(
                      ico,
                      "Ico__StateShouldBeEnded"
                  )
              })

              it("only allows manager to call", async () => {
                  const icoInvestor1connected = ico.connect(inverstor1)
                  await expect(icoInvestor1connected.burn()).to.be.rejectedWith("not owner")
              })

              it("should burn tokens", async () => {
                  // increasing blocktime to end contract
                  await network.provider.send("evm_increaseTime", [3600])

                  // we need to add a non-view transaction after incresing time to update the block.timestamp (mine a block)
                  await deployer.sendTransaction({ to: ethers.constants.AddressZero })

                  const icoState = await ico.getState()
                  assert.equal(icoState, 1) // state [1] = afterEnd on our ICO.sol

                  // burning tokens
                  await ico.burn()
                  const founderBal = await ico.getFounderBalance()
                  assert.equal(founderBal.toString(), "0")
              })

              it("test that the contract state is always running after deplopment, unless halted or ended", async () => {
                  const icoState = await ico.getState()
                  assert.equal(icoState, 2)
              })
          })

          describe("transfer", () => {
              it("checks you cannot transfer tokens before trade time begins", async () => {
                  // at this point the ico state is running. So block timestamp can't be tokenTradeTime
                  await expect(
                      ico.transfer("0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C", 100)
                  ).to.be.revertedWithCustomError(ico, "Ico__CannotTransferBeforeTradeTime")
              })

              it("checks trasfer is succesful", async () => {
                  // increase time to match tokenTradeTime
                  await network.provider.send("evm_increaseTime", [3600 + 3600])

                  // mine a block by using a write fuction to change block time
                  await deployer.sendTransaction({ to: ethers.constants.AddressZero })

                  // at this point the ico has ended and an hour has lapsed.
                  const icoState = await ico.getState()
                  assert.equal(icoState, 1) // state [1] = afterEnd on our ICO.sol

                  // check transfer succesful
                  await ico.transfer("0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C", 100)
                  const balOfAddr = await ico.getAddressBalance(
                      "0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C"
                  )
                  assert.equal(balOfAddr.toString(), "100")
              })
          })

          describe("transferFrom", () => {
              it("checks you cannot transfer tokens before trade time begins", async () => {
                  // at this point the ico state is running. So block timestamp can't be tokenTradeTime
                  await expect(
                      ico.transferFrom(
                          deployer.address,
                          "0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C",
                          100
                      )
                  ).to.be.revertedWithCustomError(ico, "Ico__CannotTransferBeforeTradeTime")
              })

              it("checks trasfer is succesful", async () => {
                  // increase time to match tokenTradeTime
                  await network.provider.send("evm_increaseTime", [3600 + 3600])

                  // mine a block by using a write fuction to change block time
                  await deployer.sendTransaction({ to: ethers.constants.AddressZero })

                  // at this point the ico has ended and an hour has lapsed.
                  const icoState = await ico.getState()
                  assert.equal(icoState, 1) // state [1] = afterEnd on our ICO.sol

                  // Approve the recipient to spend tokens on behalf of the sender (deployer)
                  await ico.approve("0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C", 100)

                  // check transfer succesful
                  await ico.transferFrom(
                      deployer.address,
                      "0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C",
                      100
                  )
                  const balOfAddr = await ico.getAddressBalance(
                      "0x7F000649C3f42C2D80dc3bd99F3F5e7CB737092C"
                  )
                  const balOfDeployer = await ico.getAddressBalance(deployer.address)
                  console.log(balOfDeployer.toString())

                  assert.equal(balOfAddr.toString(), "100")
                  assert.equal(balOfDeployer.toString(), "99900")
              })
          })
      })
