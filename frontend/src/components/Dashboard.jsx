import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TransactionList from './TransactionList';

const Dashboard = ({ userData, onLogout }) => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userData.aptosAddress) return;
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:8000/api/get-account-transactions/${userData.aptosAddress}`);
        setTransactions(response.data);
      } catch (err) {
        setError('Failed to fetch transaction history.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [userData.aptosAddress]);

  const shortAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <h2>@{userData.twitterId}'s Dashboard</h2>
          <p className="wallet-address" title={userData.aptosAddress}>
            Wallet: {shortAddress(userData.aptosAddress)}
          </p>
        </div>
        <button onClick={onLogout} className="logout-btn">
          Log Out
        </button>
      </header>
      
      <main className="dashboard-main">
        <h3>Recent Activity</h3>
        {isLoading ? (
          <p className="loading-text">Loading transactions...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : (
          <TransactionList transactions={transactions} ownerAddress={userData.aptosAddress} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;