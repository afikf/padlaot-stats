'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import FetchGameNight from './fetch-game-night';

interface Player {
  id: string;
  name: string;
  email?: string;
  gamesPlayed?: number;
  totalScore?: number;
  lastGameDate?: string;
  isSubscribed?: boolean;
}

export default function TestFirebase() {
  const [status, setStatus] = useState<string>('Testing Firebase configuration...');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        // Test Firestore connection first
        setStatus('✅ Firebase is configured correctly! Fetching players...');
        
        // Get players from Firestore
        const playersQuery = query(
          collection(db, 'players'),
          orderBy('name', 'asc')
        );
        
        const querySnapshot = await getDocs(playersQuery);
        const playersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Player[];

        setPlayers(playersData);
        setStatus(`✅ Successfully loaded ${playersData.length} players`);
      } catch (error) {
        console.error('Error fetching players:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setStatus('❌ Error loading players');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Firebase Configuration Test</h1>
      
      {/* Game Night Data Structure */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Game Night Data Structure</h2>
        <FetchGameNight />
      </div>
      
      {/* Status Section */}
      <div className="mb-8">
        <div className="p-4 bg-gray-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Firebase Status</h2>
          <p className="text-lg mb-2">{status}</p>
          <p className={`${auth ? 'text-green-600' : 'text-red-600'}`}>
            {auth ? '✅ Auth is initialized' : '❌ Auth is not initialized'}
          </p>
          {error && (
            <p className="text-red-600 mt-2">Error: {error}</p>
          )}
        </div>
      </div>

      {/* Players Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Players List</h2>
        
        {loading ? (
          <div className="text-center p-4">
            <p>Loading players...</p>
          </div>
        ) : players.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <div key={player.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold mb-2">{player.name}</h3>
                <div className="text-sm text-gray-600">
                  {player.email && (
                    <p className="mb-1">📧 {player.email}</p>
                  )}
                  {player.gamesPlayed !== undefined && (
                    <p className="mb-1">🎮 Games played: {player.gamesPlayed}</p>
                  )}
                  {player.totalScore !== undefined && (
                    <p className="mb-1">🎯 Total score: {player.totalScore}</p>
                  )}
                  {player.lastGameDate && (
                    <p className="mb-1">🗓️ Last game: {new Date(player.lastGameDate).toLocaleDateString()}</p>
                  )}
                  {player.isSubscribed !== undefined && (
                    <p className={`mb-1 ${player.isSubscribed ? 'text-green-600' : 'text-gray-400'}`}>
                      {player.isSubscribed ? '✅ Subscribed' : '❌ Not subscribed'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p>No players found in the database.</p>
          </div>
        )}
      </div>
    </div>
  );
} 