const BountyHunter = artifacts.require('BountyHunter');

module.exports = function(deployer) {
  deployer.deploy(BountyHunter);
};
