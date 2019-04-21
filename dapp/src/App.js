import React, { Component, Fragment } from 'react';
import truffleContract from 'truffle-contract';
import Web3 from 'web3';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';

import bountyArtifact from '../../build/contracts/BountyHunter.json';
//import erc20artifact from '../../build/contracts/ERC20.json';

const BountyHunter = truffleContract(bountyArtifact);
BountyHunter.setProvider(window.ethereum);
//const ERC20 = truffleContract(erc20artifact);

class App extends Component {

  state = {
    created: [],
    held: [],
    won: [],

    account: null,

    token: '',
    reward: '0',
  }
  web3 = new Web3(window.ethereum);


  async componentDidMount() {
    this.contract = await BountyHunter.deployed();    
    this.loadData();
  }

  async loadData() {
    const [account] = await this.web3.eth.getAccounts();

    const [created, held, won] = await Promise.all([
      this.contract.getPastEvents('BountyCreated', { filter: {creator: account } }),
      this.contract.getPastEvents('BountyPassed', { filter: {to: account } }),
      this.contract.getPastEvents('BountyWon', { filter: {user: account } }),
    ]);
    const addData = async (event) => {
      event.extraData = {
        holder: await this.contract.currentHolder(event.returnValues.id),
      };
      return event;
    }
    this.setState({
      account,
      created: await Promise.all(created.map(addData)),
      held: await Promise.all(held.map(addData)),
      won: await Promise.all(won.map(addData)),
    });
  }

  async createBounty() {
    const receipt = await this.contract.createBounty(this.state.token, { from: this.state.account, value: this.state.reward });
    console.log(receipt);
    this.loadData();
  }

  render() {
    const { account } = this.state;
    return (
      <div>
        <AppBar position="static" color="default">
          <Toolbar>
            <Typography variant="h6" color="inherit">
              Bounty Hunter
            </Typography>
          </Toolbar>
        </AppBar>

        <ExpansionPanel>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Create Bounty</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <TextField
              label="Token Address"
              value={this.state.token}
              onChange={e => this.setState({ token: e.target.value })}
              variant="filled"
            />
            <TextField
              label="Reward (ETH)"
              value={this.web3.utils.fromWei(this.state.reward, 'ether')}
              onChange={e => this.setState({ reward: this.web3.utils.toWei(e.target.value, 'ether') })}
              type="number"
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: '0',
                step: '0.05',
              }}
              margin="normal"
              variant="filled"
            />
            <Button onClick={() => this.createBounty()}>Create Bounty</Button>
          </ExpansionPanelDetails>
        </ExpansionPanel>

        <ExpansionPanel>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Bounties Received</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>

            {this.state.held.map(bounty => <Bounty bounty={bounty} contract={this.contract} web3={this.web3} account={account} loadData={() => this.loadData()} />)}
            {this.state.won.map(bounty => <Bounty bounty={bounty} contract={this.contract} web3={this.web3} account={account} loadData={() => this.loadData()} />)}
          </ExpansionPanelDetails>
        </ExpansionPanel>

        <ExpansionPanel>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Bounties Created</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>

            {this.state.created.map(bounty => <Bounty bounty={bounty} contract={this.contract} web3={this.web3} account={account} loadData={() => this.loadData()} />)}
          </ExpansionPanelDetails>
        </ExpansionPanel>
      </div>
    );
  }
}

const Bounty = ({ bounty, contract, web3, account, loadData }) => {
  const [next, setNext] = React.useState('');
  return (
    <Paper>
      <Typography>{bounty.returnValues.id}</Typography>
      <Typography>Current holder: {bounty.extraData.holder}</Typography>

      {bounty.extraData.holder === account && (
        <Fragment>
          <TextField
            label="Next person..."
            value={next}
            onChange={e => setNext(e.target.value)}
            variant="filled"
          />
          <Button onClick={async () => {
            const { logs } = await contract.passBounty(bounty.returnValues.id, next, { from: account });
            if (logs[0].name === 'BountyWon') {
              alert(`You won! You found the token holder!\nYou will receive your reward once ${logs[0].returnValues.user} confirms.`)
            }
            loadData();
          }}>Pass Bounty</Button>
        </Fragment>
      )}
    </Paper>
  );
}

export default App;
