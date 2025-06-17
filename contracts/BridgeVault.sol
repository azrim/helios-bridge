// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint amount) external returns (bool);
}

contract BridgeVault {
    address public admin;

    constructor() {
        admin = msg.sender;
    }

    event Locked(address indexed from, uint amount);
    event Released(address indexed to, uint amount);

    function lock(address token, uint amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        emit Locked(msg.sender, amount);
    }

    function release(address token, address to, uint amount) external {
        require(msg.sender == admin, "Only admin");
        IERC20(token).transferFrom(address(this), to, amount);
        emit Released(to, amount);
    }
}
