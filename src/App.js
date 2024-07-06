import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import VotingArtifact from './contracts/Voting.json';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
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
  const [showResults, setShowResults] = useState({});
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // Connect to Web3
        let web3Instance;
        if (window.ethereum) {
          web3Instance = new Web3(window.ethereum);
          try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
          } catch (error) {
            console.error("User denied account access");
          }
        } else if (window.web3) {
          web3Instance = new Web3(window.web3.currentProvider);
        } else {
          console.log('Non-Ethereum browser detected. Consider trying MetaMask!');
          return;
        }
        setWeb3(web3Instance);

        const accs = await web3Instance.eth.getAccounts();
        setAccounts(accs);
        setConnectedAccount(accs[0]);

        const networkId = await web3Instance.eth.net.getId();
        console.log("Connected to network ID:", networkId);
        
        const deployedNetwork = VotingArtifact.networks[networkId.toString()];
        if (!deployedNetwork) {
          throw new Error(`Contract not deployed on network ${networkId}`);
        }

        const instance = new web3Instance.eth.Contract(
          VotingArtifact.abi,
          deployedNetwork.address
        );
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
      const pollCount = await contractInstance.methods.pollCount().call();
      const loadedPolls = [];
      for (let i = 1; i <= pollCount; i++) {
        const poll = await contractInstance.methods.getPoll(i).call();
        loadedPolls.push({
          id: i,
          question: poll[0],
          options: poll[1],
          votes: poll[2].map(v => parseInt(v)),
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
      await votingContract.methods.createPoll(newPollQuestion, options).send({ from: accounts[0], gas: 3000000 });
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
      await votingContract.methods.vote(pollId, optionId).send({ from: accounts[0], gas: 3000000 });
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
      await votingContract.methods.closePoll(pollId).send({ from: accounts[0], gas: 3000000 });
      await loadPolls(votingContract);
      setError(null);
    } catch (error) {
      console.error("Error closing poll:", error);
      setError(`Error closing poll: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleResults = (pollId) => {
    setShowResults(prev => ({...prev, [pollId]: !prev[pollId]}));
  };

  return (
    <div className="App">
      <div className="blockchain-background"></div>
      <header className="App-header">
        <h1>DemocraDApp</h1>
        <p>Decentralized Voting Platform</p>
        {connectedAccount && (
          <div className="connected-account">
            Connected: {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
          </div>
        )}
      </header>
      {error && <p className="error">{error}</p>}
      {loading && <div className="loading"><div></div><div></div><div></div><div></div></div>}
      
      <button onClick={() => setShowCreatePoll(!showCreatePoll)} className="toggle-create-poll">
        {showCreatePoll ? 'Hide Create Poll' : 'Create New Poll'}
      </button>

      <CSSTransition
        in={showCreatePoll}
        timeout={300}
        classNames="fade"
        unmountOnExit
      >
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
          <button onClick={createPoll} className="create-btn">Create Poll</button>
        </div>
      </CSSTransition>

      <div className="active-polls">
        <h2>Active Polls</h2>
        <TransitionGroup>
          {polls.map(poll => (
            <CSSTransition key={poll.id} timeout={300} classNames="poll">
              <div className="poll">
                <h3>{poll.question}</h3>
                <div className="options-container">
                  {poll.options.map((option, index) => (
                    <button
                      key={index}
                      className="option-button"
                      onClick={() => vote(poll.id, index)}
                      disabled={!poll.active}
                    >
                      {option} 
                      <span className="vote-count">({poll.votes[index]} votes)</span>
                    </button>
                  ))}
                </div>
                {poll.active ? (
                  <button className="close-poll-button" onClick={() => closePoll(poll.id)}>Close Poll</button>
                ) : (
                  <button className="show-results-button" onClick={() => toggleResults(poll.id)}>
                    {showResults[poll.id] ? 'Hide Results' : 'Show Results'}
                  </button>
                )}
                <CSSTransition in={showResults[poll.id]} timeout={300} classNames="results" unmountOnExit>
                  <div className="results">
                    <h4>Final Results:</h4>
                    {poll.options.map((option, index) => (
                      <div key={index} className="result-bar">
                        <div className="result-label">{option}: {poll.votes[index]} votes</div>
                        <div 
                          className="result-fill" 
                          style={{width: `${(poll.votes[index] / Math.max(...poll.votes, 1)) * 100}%`}}
                        ></div>
                      </div>
                    ))}
                  </div>
                </CSSTransition>
              </div>
            </CSSTransition>
          ))}
        </TransitionGroup>
      </div>
    </div>
  );
}

export default App;