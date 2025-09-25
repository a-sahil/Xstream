import { useState } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [uuid, setUuid] = useState('');
  const [aptosAddress, setAptosAddress] = useState('');
  const [userData, setUserData] = useState(null); // State to hold user data after successful lookup
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setUserData(null);
    setError('');

    try {
      const response = await axios.post('http://localhost:8000/api/get-user-by-wallet', {
        uuid,
        aptosAddress
      });
      // On success, store user data and switch to dashboard view
      setUserData({
        twitterId: response.data.twitterId,
        aptosAddress: aptosAddress,
        uuid: uuid
      });
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message || 'An unexpected error occurred.');
      } else {
        setError('Could not connect to the backend. Please ensure it is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to log out and return to the lookup form
  const handleLogout = () => {
    setUserData(null);
    setUuid('');
    setAptosAddress('');
    setError('');
  };

  // Conditionally render the Dashboard or the Lookup Form
  if (userData) {
    return <Dashboard userData={userData} onLogout={handleLogout} />;
  }

  return (
    <div className="container">
      <h1>SocioAgent User Lookup</h1>
      <form onSubmit={handleSubmit} className="lookup-form">
        <div className="input-group">
          <label htmlFor="uuid">User UUID</label>
          <input
            id="uuid"
            type="text"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            placeholder="Enter the user's unique ID"
            disabled={isLoading}
          />
        </div>
        <div className="input-group">
          <label htmlFor="aptosAddress">Aptos Wallet Address</label>
          <input
            id="aptosAddress"
            type="text"
            value={aptosAddress}
            onChange={(e) => setAptosAddress(e.target.value)}
            placeholder="Enter the Aptos wallet address"
            disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading || !uuid || !aptosAddress}>
          {isLoading ? 'Verifying...' : 'Access Dashboard'}
        </button>
      </form>

      {error && (
        <div className="result error">
          <p className="result-text">{error}</p>
        </div>
      )}
    </div>
  );
}

export default App;