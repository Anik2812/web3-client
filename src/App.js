import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import TruffleContract from '@truffle/contract';
import VotingArtifact from './contracts/Voting.json';
import PollCard from './PollCard';
import './App.css';

function App() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [votingContract, setVotingContract] = useState(null);
  const [polls, setPolls] = useState([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);

          await window.ethereum.request({ method: 'eth_requestAccounts' });

          const accs = await web3Instance.eth.getAccounts();
          setAccounts(accs);

          const VotingContract = TruffleContract(VotingArtifact);
          VotingContract.setProvider(web3Instance.currentProvider);

          const networkId = await web3Instance.eth.net.getId();
          const deployedNetwork = VotingArtifact.networks[networkId];
          if (!deployedNetwork) {
            throw new Error(`Contract not deployed on network ${networkId}`);
          }

          const instance = await VotingContract.at(deployedNetwork.address);
          setVotingContract(instance);
          setContractAddress(deployedNetwork.address);

          await loadPolls(instance);
        } else {
          setError('Please install MetaMask!');
        }
      } catch (error) {
        console.error("Error initializing Web3:", error);
        setError(`Error initializing Web3: ${error.message}`);
      }
    };

    init();
  }, []);

  const loadPolls = async (contractInstance) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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
      await votingContract.createPoll(newPollQuestion, options, { from: accounts[0] });
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
      await votingContract.vote(pollId, optionId, { from: accounts[0] });
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
      await votingContract.closePoll(pollId, { from: accounts[0] });
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
      <h1>DemocraDApp</h1>
      {error && <p className="error">{error}</p>}
      {loading && <div className="spinner"></div>}
      {contractAddress && (
        <div className="contract-address">
          <p><strong>Contract Address:</strong> {contractAddress}</p>
          <p>Use this address to interact with the contract or check it on a blockchain explorer.</p>
        </div>
      )}
      <div className="create-poll-section">
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
        <button onClick={createPoll} className="create-poll-button">
          <i className="fas fa-plus"></i> Create Poll
        </button>
      </div>
      <div className="polls-section">
        <h2>Active Polls</h2>
        {polls.map(poll => (
          <PollCard
            key={poll.id}
            poll={poll}
            onVote={vote}
            onClose={closePoll}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
