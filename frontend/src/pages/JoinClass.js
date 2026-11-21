import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinRoom } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const JoinClass = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        const { data } = await joinRoom({ roomCode: code });
        navigate(`/room/${data.room._id}`);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired class code.');
        setLoading(false);
      }
    };
    run();
  }, [code, user, navigate]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Joining class...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>;
  return null;
};

export default JoinClass;