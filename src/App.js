import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import TruffleContract from '@truffle/contract';
import VotingArtifact from './contracts/Voting.json';
import './App.css';

function App() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [votingContract, setVotingContract] = useState(null);
  const [polls, setPolls] = useState([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Connect directly to Ganache
        const ganacheProvider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
        const web3Instance = new Web3(ganacheProvider);
        setWeb3(web3Instance);

        const accs = await web3Instance.eth.getAccounts();
        setAccounts(accs);

        const VotingContract = TruffleContract(VotingArtifact);
        VotingContract.setProvider(ganacheProvider);

        const networkId = await web3Instance.eth.net.getId();
        console.log("Connected to network ID:", networkId);
        
        const deployedNetwork = VotingArtifact.networks[networkId.toString()];
        if (!deployedNetwork) {
          throw new Error(`Contract not deployed on network ${networkId}`);
        }

        const instance = await VotingContract.at(deployedNetwork.address);
        setVotingContract(instance);

        await loadPolls(instance);
      } catch (error) {
        console.error("Error initializing Web3:", error);
        setError(`Error initializing Web3: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const loadPolls = async (contractInstance) => {
    try {
      const pollCount = await contractInstance.pollCount();
      const loadedPolls = [];
      for (let i = 1; i <= pollCount.toNumber(); i++) {
        const poll = await contractInstance.getPoll(i);
        loadedPolls.push({
          id: i,
          question: poll[0],
          options: poll[1],
          votes: poll[2].map(v => v.toNumber()),
          active: poll[3]
        });
      }
      setPolls(loadedPolls);
    } catch (error) {
      console.error("Error loading polls:", error);
      setError(`Error loading polls: ${error.message}`);
    }
  };

  const createPoll = async () => {
    if (!votingContract) {
      setError('Voting contract is not initialized');
      return;
    }
    if (!newPollQuestion || !newPollOptions) {
      setError('Please provide a question and options');
      return;
    }
    try {
      setLoading(true);
      const options = newPollOptions.split(',').map(option => option.trim());
      await votingContract.createPoll(newPollQuestion, options, { from: accounts[0], gas: 3000000 });
      setNewPollQuestion('');
      setNewPollOptions('');
      await loadPolls(votingContract);
      setError(null);
    } catch (error) {
      console.error("Error creating poll:", error);
      setError(`Error creating poll: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (pollId, optionId) => {
    if (!votingContract) {
      setError('Voting contract is not initialized');
      return;
    }
    try {
      setLoading(true);
      await votingContract.vote(pollId, optionId, { from: accounts[0], gas: 3000000 });
      await loadPolls(votingContract);
      setError(null);
    } catch (error) {
      console.error("Error voting:", error);
      setError(`Error voting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const closePoll = async (pollId) => {
    if (!votingContract) {
      setError('Voting contract is not initialized');
      return;
    }
    try {
      setLoading(true);
      await votingContract.closePoll(pollId, { from: accounts[0], gas: 3000000 });
      await loadPolls(votingContract);
      setError(null);
    } catch (error) {
      console.error("Error closing poll:", error);
      setError(`Error closing poll: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="blockchain-background"></div>
      <h1>DemocraDApp</h1>
      {error && <p className="error">{error}</p>}
      {loading && <div className="loading"></div>}
      <div className="create-poll">
        <h2>Create New Poll</h2>
        <input
          type="text"
          placeholder="Poll question"
          value={newPollQuestion}
          onChange={(e) => setNewPollQuestion(e.target.value)}
        />
        <input
          type="text"
          placeholder="Options (comma-separated)"
          value={newPollOptions}
          onChange={(e) => setNewPollOptions(e.target.value)}
        />
        <button onClick={createPoll}>Create Poll</button>
      </div>
      <div className="active-polls">
        <h2>Active Polls</h2>
        {polls.map(poll => (
          <div key={poll.id} className="poll">
            <h3>{poll.question}</h3>
            {poll.options.map((option, index) => (
              <button
                key={index}
                className="option-button"
                onClick={() => vote(poll.id, index)}
                disabled={!poll.active}
              >
                {option} ({poll.votes[index]} votes)
              </button>
            ))}
            {poll.active && (
              <button className="close-poll-button" onClick={() => closePoll(poll.id)}>Close Poll</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;