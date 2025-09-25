import React from 'react';

// A helper to get an icon based on transaction type
const getTxnIcon = (type) => {
  switch (type.toLowerCase()) {
    case 'send': return '💸';
    case 'receive': return '💰';
    case 'swap': return '🔄';
    case 'contract interaction': return '📄';
    default: return '⚙️';
  }
};

const TransactionList = ({ transactions, ownerAddress }) => {
  if (transactions.length === 0) {
    return <div className="txn-list-empty"><p>No transactions found for this account.</p></div>;
  }
  
  const shortAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="txn-list">
      {transactions.map((tx) => (
        <a 
          key={tx.version}
          href={`https://explorer.aptoslabs.com/txn/${tx.hash}?network=testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="txn-item-link"
        >
          <div className={`txn-item ${tx.success ? '' : 'failed'}`}>
            <div className="txn-icon">{getTxnIcon(tx.type)}</div>
            <div className="txn-details">
              <span className="txn-type">{tx.type}</span>
              {tx.type === 'Send' && <span className="txn-party">to {shortAddress(tx.details.to)}</span>}
              {tx.type === 'Receive' && <span className="txn-party">from {shortAddress(tx.details.from)}</span>}
              {tx.type === 'Contract Interaction' && <span className="txn-party">{tx.details.function}</span>}
              <span className="txn-hash" title={tx.hash}>{shortAddress(tx.hash)}</span>
            </div>
            <div className="txn-right">
              {tx.details.amount && <span className={`txn-amount ${tx.details.direction}`}>{tx.details.direction === 'out' ? '-' : '+'}{tx.details.amount}</span>}
              <span className="txn-time">{new Date(tx.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default TransactionList;