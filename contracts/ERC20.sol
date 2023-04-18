// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ERC20Interface {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract Block is ERC20Interface {
    // state variables
    string public name = "Block";
    string public symbol = "BLK";
    uint public decimal = 0;
    uint public override totalSupply;
    address public founder;

    mapping(address => uint) balances;
    mapping(address => mapping(address => uint)) allowed;

    constructor() {
        totalSupply = 100000;
        founder = msg.sender;
        balances[founder] = totalSupply;
    }

    function balanceOf(
        address tokenOwner
    ) public view override returns (uint256) {
        return balances[tokenOwner];
    }

    function transfer(
        address _to,
        uint256 tokens
    ) public virtual override returns (bool) {
        // first check if they have enough tokens in their account
        require(
            balances[msg.sender] >= tokens,
            "Not enough tokens to transfer"
        );
        //transfering tokens
        balances[_to] += tokens;
        //subtract tokens from sender
        balances[msg.sender] -= tokens;
        emit Transfer(msg.sender, _to, tokens);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) external view override returns (uint256) {
        return allowed[owner][spender];
    }

    function approve(
        address spender,
        uint256 tokens
    ) external override returns (bool) {
        // first check if the owner has enough tokens in their account
        require(
            balances[msg.sender] >= tokens,
            "Not enough tokens to transfer"
        );

        // check tokens being transfered are greater than 0
        require(tokens > 0, "token must be greater than 0");
        allowed[msg.sender][spender] = tokens;
        emit Transfer(msg.sender, spender, tokens);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 tokens
    ) external override returns (bool) {
        require(allowed[sender][recipient] >= tokens);
        require(
            balances[sender] >= tokens,
            "you cannot transfer more than you have"
        );

        // transfering
        balances[sender] -= tokens;
        balances[recipient] += tokens;
        return true;
    }
}
