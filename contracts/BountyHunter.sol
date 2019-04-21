pragma solidity >=0.4.21 <0.6.0;

contract ERC20 {
  function name() public view returns (string memory);
  function balanceOf(address) public view returns (uint);
}

contract BountyHunter {
  struct Bounty {
    address targetToken;
    address payable creator;
    address payable winner;
    uint created;
    uint reward;
    bool winnerConfirmed;
    bool canceled;
    address payable[] steps;
  }

  Bounty[] bounties;

  event BountyCreated(address targetToken, address indexed creator, uint id);
  event BountyPassed(uint indexed id, address indexed from, address indexed to);
  event BountyWon(uint indexed id, address indexed user);
  event BountyConfirmed(uint indexed id);

  function createBounty(address targetToken) public payable {
    require(msg.value > 0);
    uint id = bounties.length;
    bounties.length += 1;
    bounties[id].targetToken = targetToken;
    bounties[id].creator = msg.sender;
    bounties[id].reward = msg.value;
    bounties[id].created = now;

    emit BountyCreated(targetToken, msg.sender, id);
  }

  function getBountyInfo(uint id) external view returns (address, address, address, uint, uint, bool, bool, uint) {
    Bounty storage bounty = bounties[id];
    return (bounty.targetToken, bounty.creator, bounty.winner, bounty.created, bounty.reward, bounty.winnerConfirmed, bounty.canceled, bounty.steps.length);
  }

  function currentHolder(uint id) public view returns (address) {
    if (bounties[id].steps.length == 0) {
      return bounties[id].creator;
    }
    return bounties[id].steps[bounties[id].steps.length - 1];
  }

  function isInChain(Bounty storage bounty, address user) internal view returns (bool) {
    if (bounty.creator == user || bounty.winner == user) {
      return true;
    }
    for (uint i = 0; i < bounty.steps.length; i++) {
      if (bounty.steps[i] == user) {
        return true;
      }
    }
  }

  function passBounty(uint id, address payable nextHolder) public {
    require(msg.sender == currentHolder(id));
    require(bounties[id].winner == address(0));
    require(!isInChain(bounties[id], nextHolder));

    if (ERC20(bounties[id].targetToken).balanceOf(nextHolder) > 0) {
      winner(id, nextHolder);
    } else {
      pass(id, nextHolder);
    }
  }

  function confirm(uint id) public {
    require(!bounties[id].winnerConfirmed);
    require(bounties[id].winner == msg.sender);
    distribute(id);
    emit BountyConfirmed(id);
  }

  function distribute(uint id) internal {
    uint total = 5000;
    uint winnerWeight = 5000;
    uint[] memory weights = new uint[](bounties[id].steps.length);
    uint startingBalance = address(this).balance;

    for (uint i = 0; i < bounties[id].steps.length; i++) {
      uint weight = ((i / bounties[id].steps.length) ** 2) * 10000;
      weights[i] = weight;
      total += weight;
    }

    uint reward = bounties[id].reward;
    for (uint i = 0; i < bounties[id].steps.length; i++) {
      bounties[id].steps[i].send(reward * (weights[i] / total));
    }
    bounties[id].winner.transfer(reward * (winnerWeight / total));
    //assert(startingBalance - address(this).balance == reward);
  }

  function winner(uint id, address payable _winner) internal {
    bounties[id].winner = _winner;
    emit BountyWon(id, _winner);
  }

  function pass(uint id, address payable nextHolder) internal {
    bounties[id].steps.push(nextHolder);
    emit BountyPassed(id, msg.sender, nextHolder);
  }

  function withdraw(uint id) public {
    require(bounties[id].creator == msg.sender);
    require(!bounties[id].canceled);
    require(!bounties[id].winnerConfirmed);
    require(now - bounties[id].created > 7 days);

    bounties[id].canceled = true;
    address(msg.sender).transfer(bounties[id].reward);
  }
}
