// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20.sol";

error Ico__MustBeRunning();
error Ico__AmountBelowMimimumAllowed();
error Ico__AmountAboveMaximumAllowed();
error Ico__AmountRaisedCannotExceedCap();
error Ico__StateShouldBeEnded();
error Ico__CannotTransferBeforeTradeTime();

contract ICO is Block {
    address public manager;
    address payable public deposit;
    uint tokenPrice = 0.1 ether;

    uint public cap = 300 ether; // amount of ether we want in circulation
    uint public raisedAmount;
    uint public icoStart = block.timestamp; // ICO starts when we deploy
    uint public icoEnd = block.timestamp + 3600; // ICO to run for 1hr (60*60 secs)
    uint tokenTradeTime = icoEnd + 3600; // You can trade the tokens after 1hr of the ICO's end.abi

    //Prevent people from selling ether when the ICO is running (avoiding losses)

    uint public maxInvest = 10 ether; // max amount an invetor can invest
    uint public minInvest = 0.1 ether; // min amount an investor can invest

    enum State {
        beforeStart,
        afterEnd,
        running,
        halted
    }

    State public icoState;

    event Invest(address investor, uint value, uint tokens);

    constructor(address payable _deposit) {
        deposit = _deposit;
        manager = msg.sender;
        icoState = State.beforeStart;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "not owner");
        _;
    }

    function halt() public onlyManager {
        icoState = State.halted;
    }

    function resume() public onlyManager {
        icoState = State.running;
    }

    // as a security feature we need option to change deposit address incase old one got hacked (preventing further losses)
    function changeDepositAddr(address payable newDeposit) public onlyManager {
        deposit = newDeposit;
    }

    function invest() public payable returns (bool) {
        icoState = getState();
        /* require(
            icoState == State.running,
            "cannot invest when ICO isn't running"
        ); */

        if (icoState != State.running) {
            revert Ico__MustBeRunning();
        }

        /* require(
            msg.value >= minInvest && msg.value <= maxInvest,
            "your amount must be within allowed range"
        ); */

        if (msg.value < minInvest) {
            revert Ico__AmountBelowMimimumAllowed();
        }

        if (msg.value > maxInvest) {
            revert Ico__AmountAboveMaximumAllowed();
        }

        raisedAmount = msg.value;

        /* require(raisedAmount <= cap, "amount raised cannot exceed the set cap"); */

        if (raisedAmount > cap) {
            revert Ico__AmountRaisedCannotExceedCap();
        }

        uint tokens = msg.value / tokenPrice; // if we invest 10 ether we get (10/0.1) tokens

        // update balances
        balances[msg.sender] += tokens;
        balances[founder] -= tokens;
        deposit.transfer(msg.value); // deposit the invested value to our deposit address

        emit Invest(msg.sender, msg.value, tokens);
        return true;
    }

    // burning tokens reduces supply hence the price of the token may rise.
    function burn() public onlyManager returns (bool) {
        icoState = getState();
        // require(icoState == State.afterEnd);
        if (icoState != State.afterEnd) {
            revert Ico__StateShouldBeEnded();
        }
        //burn
        balances[founder] = 0;
        return true;
    }

    // trasfer token to some other account
    function transfer(
        address to,
        uint tokens
    ) public override returns (bool success) {
        /* require(
            block.timestamp > tokenTradeTime,
            "you can't transfer before the trade time begins"
        ); */

        if (block.timestamp <= tokenTradeTime) {
            revert Ico__CannotTransferBeforeTradeTime();
        }

        super.transfer(to, tokens); // super keyword ensures we call transfer from your parent contract (Block)
        // if not used, this func will go into an infinite loop

        // or

        // Block.transfer(to,tokens);

        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint tokens
    ) public override returns (bool success) {
        /* require(
            block.timestamp > tokenTradeTime,
            "you can't transfer before the trade time begins"
        ); */

        if (block.timestamp <= tokenTradeTime) {
            revert Ico__CannotTransferBeforeTradeTime();
        }

        super.transferFrom(from, to, tokens);
        return true;
    }

    function getState() public view returns (State) {
        if (icoState == State.halted) {
            return State.halted;
        } else if (block.timestamp < icoStart) {
            return State.beforeStart;
        } else if (block.timestamp > icoStart && block.timestamp < icoEnd) {
            return State.running;
        } else if (block.timestamp == icoStart) {
            return State.running;
        } else {
            return State.afterEnd;
        }
    }

    function getDepositAddr() public view returns (address) {
        return deposit;
    }

    function getRaisedAmount() public view returns (uint) {
        return raisedAmount;
    }

    function getCap() public view returns (uint) {
        return cap;
    }

    function getFounderBalance() public view returns (uint) {
        //return balances[msg.sender];
        // same as,
        return balances[founder];
    }

    function getManagerBalance() public view returns (uint) {
        return balances[manager];
    }

    function getAddressBalance(address x) public view returns (uint) {
        return balances[x];
    }

    function getIcoEnd() public view returns (uint) {
        return icoEnd;
    }

    function getTradeTime() public view returns (uint) {
        return tokenTradeTime;
    }

    // prevents eth getting lost when an ivestor sends eth directly to our contract without calling the invest() func
    receive() external payable {
        invest();
    }
}
