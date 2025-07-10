import { collection, getDocs, query, where, type QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from './config';

export interface Player {
  id: string;
  name: string;
  team?: string;
  position?: string;
  number?: number;
}

// Cache the players in memory
let playersCache: Player[] | null = null;
let lastFetchTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT = 10000; // 10 seconds

export async function fetchPlayers(): Promise<Player[]> {
  console.log('Fetching players, cache status:', {
    hasCachedData: !!playersCache,
    lastFetchTime,
    cacheAge: lastFetchTime ? Date.now() - lastFetchTime : null
  });
  
  try {
    // Return cached data if available and not expired
    if (playersCache && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
      console.log('Returning cached players:', playersCache.length);
      return playersCache;
    }

    console.log('Cache miss, fetching from Firestore');

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Fetch timeout')), FETCH_TIMEOUT);
    });

    // Create the fetch promise
    const fetchPromise = (async () => {
      const playersRef = collection(db, 'players');
      const querySnapshot = await getDocs(playersRef);
      return querySnapshot;
    })();

    // Race between fetch and timeout
    const querySnapshot = await Promise.race([fetchPromise, timeoutPromise]) as QuerySnapshot<DocumentData>;
    
    console.log('Got query snapshot, docs count:', querySnapshot.size);
    
    const players: Player[] = [];
    querySnapshot.forEach(doc => {
      try {
        const data = doc.data();
        if (data && typeof data === 'object' && 'name' in data) {
          const player: Player = {
            id: doc.id,
            name: data.name,
            ...(data.team && { team: data.team }),
            ...(data.position && { position: data.position }),
            ...(data.number && { number: Number(data.number) })
          };
          players.push(player);
          console.log('Processed player:', player);
        } else {
          console.warn('Invalid player data:', { id: doc.id, data });
        }
      } catch (err) {
        console.error('Error processing player doc:', { id: doc.id, error: err });
      }
    });

    if (players.length === 0) {
      console.warn('No valid players found in query result');
      throw new Error('No players found');
    }

    // Update cache
    playersCache = players;
    lastFetchTime = Date.now();

    console.log('Successfully fetched players:', players.length);
    return players;
  } catch (error) {
    console.error('Error fetching players:', error);
    // If we have cached data, return it even if expired
    if (playersCache) {
      console.log('Returning expired cache due to error');
      return playersCache;
    }
    throw error;
  }
}

export function searchPlayers(players: Player[], searchQuery: string): Player[] {
  const query = searchQuery.toLowerCase().trim();
  
  if (!query) return players;

  return players.filter(player => {
    const nameMatch = player.name.toLowerCase().includes(query);
    const teamMatch = player.team?.toLowerCase().includes(query);
    const numberMatch = player.number?.toString().includes(query);
    
    return nameMatch || teamMatch || numberMatch;
  });
}

export async function isPlayerAvailable(playerId: string): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('playerId', '==', playerId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty;
  } catch (error) {
    console.error('Error checking player availability:', error);
    throw error;
  }
} 