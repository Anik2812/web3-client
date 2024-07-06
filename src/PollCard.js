import React from 'react';
import './PollCard.css';

const PollCard = ({ poll, onVote, onClose }) => {
  return (
    <div className="poll-card">
      <h3>{poll.question}</h3>
      {poll.options.map((option, index) => (
        <div key={index} className="poll-option">
          <button 
            onClick={() => onVote(poll.id, index)} 
            disabled={!poll.active}
            className="vote-button"
          >
            {option} ({poll.votes[index]} votes)
          </button>
        </div>
      ))}
      {poll.active && (
        <button onClick={() => onClose(poll.id)} className="close-button">
          Close Poll
        </button>
      )}
    </div>
  );
};

export default PollCard;
