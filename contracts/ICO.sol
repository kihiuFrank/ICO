import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BlockToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Block", "BLK") {
        _mint(msg.sender, initialSupply);
    }
}
