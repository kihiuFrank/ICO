const { network } = require("hardhat")
const { deploy } = require("chai")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    log("____________________________")
    const args = ["0x13A19933267ec307c96f3dE8Ff8A2392C39263EB"]
    const ico = await deploy("ICO", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    //verify
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(ico.address, args)
    }
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "ico"]
