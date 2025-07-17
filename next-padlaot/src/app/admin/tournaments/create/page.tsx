'use client';
import { useState, useEffect } from 'react';
import { usePlayerStatsCache } from '@/hooks/usePlayerStatsCache';
import { collection, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tournament, TournamentTeam, TournamentMiniGame, TournamentSettings } from '@/types/tournament';
import { useRef, useState as useReactState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Step1Form {
  date: string;
  numberOfTeams: number;
  playersPerTeam: number;
  numberOfPitches: number;
}

const initialStep1: Step1Form = {
  date: '',
  numberOfTeams: 6,
  playersPerTeam: 7,
  numberOfPitches: 2,
};

function getTeamKeys(n: number) {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

export default function CreateTournamentPage() {
  const [step, setStep] = useState(0);
  const [step1, setStep1] = useState<Step1Form>(initialStep1);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState<Record<string, string[]>>({});
  const { players, loading: loadingPlayers, error: errorPlayers } = usePlayerStatsCache();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const dragPlayer = useRef<{ teamKey: string; playerId: string } | null>(null);
  const [dragOverPlayer, setDragOverPlayer] = useReactState<{ teamKey: string; playerId: string } | null>(null);
  const [playerAverages, setPlayerAverages] = useState<Record<string, number>>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = !!searchParams.get('edit');

  // Prefill state in edit mode
  useEffect(() => {
    if (isEditMode && editId) {
      (async () => {
        const ref = doc(db, 'tournaments', editId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const t = snap.data() as Tournament;
          setStep1({
            date: t.date,
            numberOfTeams: t.settings.numberOfTeams,
            playersPerTeam: t.settings.playersPerTeam,
            numberOfPitches: t.settings.numberOfPitches,
          });
          setSelectedPlayers(t.participants);
          // Convert teams to Record<string, string[]>
          const teamObj: Record<string, string[]> = {};
          Object.entries(t.teams).forEach(([k, v]) => {
            teamObj[k] = v.players;
          });
          setTeams(teamObj);
          setStep(2); // Jump to team selection
        }
      })();
    }
  }, [isEditMode, editId]);

  // Fetch player averages on mount
  useEffect(() => {
    async function fetchAverages() {
      const snap = await getDocs(collection(db, 'playerRatings'));
      const averages: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (typeof data.average === 'number') averages[doc.id] = data.average;
      });
      setPlayerAverages(averages);
    }
    fetchAverages();
  }, []);

  function getPlayerAverage(id: string) {
    if (playerAverages[id] !== undefined && typeof playerAverages[id] === 'number') {
      return playerAverages[id].toFixed(2);
    }
    return '-';
  }
  function getTeamAverage(team: string[] | undefined) {
    const arr = Array.isArray(team) ? team : [];
    const avgs = arr.map(pid => playerAverages[pid]).filter(v => typeof v === 'number');
    if (avgs.length === 0) return '-';
    const avg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    return avg.toFixed(2);
  }

  const totalRequiredPlayers = step1.numberOfTeams * step1.playersPerTeam;
  const teamKeys = getTeamKeys(step1.numberOfTeams);

  // Initialize teams on entering step 3
  if (step === 2 && Object.keys(teams).length !== teamKeys.length) {
    const initialTeams: Record<string, string[]> = {};
    teamKeys.forEach(k => { initialTeams[k] = []; });
    setTeams(initialTeams);
  }

  // Validation for Step 1
  const validateStep1 = () => {
    const errs: { [k: string]: string } = {};
    if (!step1.date) errs.date = 'יש לבחור תאריך';
    if (step1.numberOfTeams < 2) errs.numberOfTeams = 'לפחות 2 קבוצות';
    if (step1.playersPerTeam < 1) errs.playersPerTeam = 'לפחות שחקן אחד בקבוצה';
    if (step1.numberOfPitches < 1) errs.numberOfPitches = 'לפחות מגרש אחד';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && validateStep1()) {
      setStep(1);
    } else if (step === 1 && selectedPlayers.length === totalRequiredPlayers) {
      setStep(2);
    } else if (step === 2 && isTeamsValid()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  function handleDragStart(teamKey: string, playerId: string) {
    dragPlayer.current = { teamKey, playerId };
  }
  function handleDragOver(e: React.DragEvent, teamKey: string, playerId: string) {
    e.preventDefault();
    setDragOverPlayer({ teamKey, playerId });
  }
  function handleDrop(teamKey: string, playerId: string) {
    if (dragPlayer.current) {
      const fromTeam = dragPlayer.current.teamKey;
      const fromId = dragPlayer.current.playerId;
      const toTeam = teamKey;
      const toId = playerId;
      setTeams(prev => {
        const newTeams = { ...prev };
        const fromArr = [...newTeams[fromTeam]];
        const toArr = fromTeam === toTeam ? fromArr : [...newTeams[toTeam]];
        const fromIdx = fromArr.indexOf(fromId);
        const toIdx = toArr.indexOf(toId);
        if (fromIdx !== -1 && toIdx !== -1) {
          // Swap players between teams
          if (fromTeam === toTeam) {
            // Same team: swap positions
            [fromArr[fromIdx], fromArr[toIdx]] = [fromArr[toIdx], fromArr[fromIdx]];
            newTeams[fromTeam] = fromArr;
          } else {
            // Different teams: swap players
            fromArr[fromIdx] = toId;
            toArr[toIdx] = fromId;
            newTeams[fromTeam] = fromArr;
            newTeams[toTeam] = toArr;
          }
        }
        return newTeams;
      });
      dragPlayer.current = null;
      setDragOverPlayer(null);
    }
  }
  function handleDragEnd() {
    dragPlayer.current = null;
    setDragOverPlayer(null);
  }

  // Step 1: Tournament Details (no name)
  const renderStep1 = () => (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>פרטי טורניר</h2>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 700 }}>תאריך:</label>
        <input
          type="date"
          value={step1.date}
          onChange={e => setStep1(s => ({ ...s, date: e.target.value }))}
          style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
        />
        {errors.date && <div style={{ color: 'red', fontSize: 14 }}>{errors.date}</div>}
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 700 }}>מספר קבוצות:</label>
        <input
          type="number"
          min={2}
          value={step1.numberOfTeams}
          onChange={e => setStep1(s => ({ ...s, numberOfTeams: Number(e.target.value) }))}
          style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
        />
        {errors.numberOfTeams && <div style={{ color: 'red', fontSize: 14 }}>{errors.numberOfTeams}</div>}
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 700 }}>שחקנים בכל קבוצה:</label>
        <input
          type="number"
          min={1}
          value={step1.playersPerTeam}
          onChange={e => setStep1(s => ({ ...s, playersPerTeam: Number(e.target.value) }))}
          style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
        />
        {errors.playersPerTeam && <div style={{ color: 'red', fontSize: 14 }}>{errors.playersPerTeam}</div>}
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 700 }}>מספר מגרשים (משחקים במקביל):</label>
        <input
          type="number"
          min={1}
          value={step1.numberOfPitches}
          onChange={e => setStep1(s => ({ ...s, numberOfPitches: Number(e.target.value) }))}
          style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
        />
        {errors.numberOfPitches && <div style={{ color: 'red', fontSize: 14 }}>{errors.numberOfPitches}</div>}
      </div>
      <button
        onClick={handleNext}
        style={{ padding: '12px 32px', fontSize: 18, fontWeight: 700, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, marginTop: 24 }}
      >
        הבא
      </button>
    </div>
  );

  // Step 2: Player Selection
  const renderStep2 = () => {
    const filteredPlayers = players.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase())
    );
    const isSelected = (id: string) => selectedPlayers.includes(id);
    const togglePlayer = (id: string) => {
      if (isSelected(id)) {
        setSelectedPlayers(selectedPlayers.filter(pid => pid !== id));
      } else if (selectedPlayers.length < totalRequiredPlayers) {
        setSelectedPlayers([...selectedPlayers, id]);
      }
    };
    const handleRandomSelect = () => {
      // Randomly select the required number of players from filteredPlayers
      const pool = filteredPlayers.map(p => p.id);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      setSelectedPlayers(shuffled.slice(0, totalRequiredPlayers));
    };
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>בחירת שחקנים</h2>
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="חפש שחקן..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ marginBottom: 12, fontWeight: 700 }}>
          נבחרו {selectedPlayers.length} מתוך {totalRequiredPlayers} שחקנים
        </div>
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={handleRandomSelect}
            style={{ padding: '8px 18px', fontWeight: 700, borderRadius: 6, background: '#ede9fe', border: 'none', color: '#7c3aed', marginBottom: 8 }}
          >
            בחר שחקנים אקראית
          </button>
        </div>
        {loadingPlayers ? (
          <div>טוען שחקנים...</div>
        ) : errorPlayers ? (
          <div style={{ color: 'red' }}>שגיאה בטעינת שחקנים</div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 8, background: '#fafbff', marginBottom: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {filteredPlayers.map(player => (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  style={{
                    cursor: 'pointer',
                    padding: 12,
                    borderRadius: 8,
                    border: isSelected(player.id) ? '2px solid #7c3aed' : '1px solid #ccc',
                    background: isSelected(player.id) ? '#ede9fe' : '#fff',
                    minWidth: 120,
                    textAlign: 'center',
                    fontWeight: 600,
                    boxShadow: isSelected(player.id) ? '0 2px 8px #7c3aed33' : 'none',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                  }}
                >
                  {player.name}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
          <button
            onClick={handleBack}
            style={{ padding: '10px 24px', fontSize: 16, fontWeight: 700, background: '#eee', color: '#222', border: 'none', borderRadius: 8 }}
          >
            חזור
          </button>
          <button
            onClick={handleNext}
            disabled={selectedPlayers.length !== totalRequiredPlayers}
            style={{ padding: '10px 24px', fontSize: 16, fontWeight: 700, background: selectedPlayers.length === totalRequiredPlayers ? '#7c3aed' : '#ccc', color: 'white', border: 'none', borderRadius: 8 }}
          >
            הבא
          </button>
        </div>
      </div>
    );
  };

  // --- Step 3: Team Assignment ---
  function getPlayer(id: string) {
    return players.find(p => p.id === id);
  }
  const unassignedPlayers = selectedPlayers.filter(
    pid => !Object.values(teams).flat().includes(pid)
  );

  function assignPlayerToTeam(pid: string, teamKey: string) {
    // Remove from all teams, add to selected team
    setTeams(prev => {
      const newTeams = { ...prev };
      Object.keys(newTeams).forEach(k => {
        newTeams[k] = newTeams[k].filter(id => id !== pid);
      });
      if (newTeams[teamKey].length < step1.playersPerTeam) {
        newTeams[teamKey] = [...newTeams[teamKey], pid];
      }
      return newTeams;
    });
  }

  function removePlayerFromTeam(pid: string) {
    setTeams(prev => {
      const newTeams = { ...prev };
      Object.keys(newTeams).forEach(k => {
        newTeams[k] = newTeams[k].filter(id => id !== pid);
      });
      return newTeams;
    });
  }

  function handleRandomSplit() {
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const newTeams: Record<string, string[]> = {};
    let idx = 0;
    teamKeys.forEach(k => {
      newTeams[k] = shuffled.slice(idx, idx + step1.playersPerTeam);
      idx += step1.playersPerTeam;
    });
    setTeams(newTeams);
  }

  function handleSmartSplit() {
    // Sort by name for now (could use rating in future)
    const sorted = [...selectedPlayers].sort((a, b) => {
      const pa = getPlayer(a)?.name || '';
      const pb = getPlayer(b)?.name || '';
      return pa.localeCompare(pb);
    });
    const newTeams: Record<string, string[]> = {};
    let dir = 1, idx = 0;
    for (const pid of sorted) {
      const k = teamKeys[idx];
      if (!newTeams[k]) newTeams[k] = [];
      newTeams[k].push(pid);
      idx += dir;
      if (idx === teamKeys.length) { idx = teamKeys.length - 1; dir = -1; }
      if (idx === -1) { idx = 0; dir = 1; }
    }
    teamKeys.forEach(k => {
      if (!newTeams[k]) newTeams[k] = [];
    });
    setTeams(newTeams);
  }

  function isTeamsValid() {
    return (
      teamKeys.every(k => teams[k]?.length === step1.playersPerTeam) &&
      Object.values(teams).flat().length === totalRequiredPlayers
    );
  }

  // In renderStep3, change button logic for edit mode
  const renderStep3 = () => (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>שיבוץ שחקנים לקבוצות</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button onClick={handleRandomSplit} style={{ padding: '8px 18px', fontWeight: 700, borderRadius: 6, background: '#eee', border: 'none' }}>פצל אקראית</button>
        <button onClick={handleSmartSplit} style={{ padding: '8px 18px', fontWeight: 700, borderRadius: 6, background: '#ede9fe', border: 'none', color: '#7c3aed' }}>פצל חכם</button>
      </div>
      <div style={{ marginBottom: 18 }}>
        <strong>שחקנים לא משובצים:</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {unassignedPlayers.map(pid => {
            const p = getPlayer(pid);
            if (!p) return null;
            return (
              <span key={pid} style={{ background: '#eee', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }} onClick={() => {
                // Assign to team with least players
                const counts = teamKeys.map(k => teams[k].length);
                const min = Math.min(...counts);
                const team = teamKeys.find(k => teams[k].length === min) || teamKeys[0];
                assignPlayerToTeam(pid, team);
              }}>{p.name} ({getPlayerAverage(pid)})</span>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        {teamKeys.map(teamKey => (
          <div key={teamKey} style={{ flex: 1, minWidth: 180, background: '#f8fafc', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px #7c3aed11' }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>קבוצה {teamKey}</div>
            <div style={{ marginBottom: 8, fontWeight: 700, color: '#7c3aed' }}>ממוצע דירוג: {getTeamAverage(teams[teamKey])}</div>
            <div style={{ marginBottom: 8 }}>
              <strong>שחקנים:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {teams[teamKey]?.map((pid, idx) => {
                  const p = getPlayer(pid);
                  if (!p) return null;
                  const isCaptain = idx === 0;
                  const isDragOver = dragOverPlayer && dragOverPlayer.teamKey === teamKey && dragOverPlayer.playerId === pid;
                  return (
                    <div
                      key={pid}
                      draggable
                      onDragStart={() => handleDragStart(teamKey, pid)}
                      onDragOver={e => handleDragOver(e, teamKey, pid)}
                      onDrop={() => handleDrop(teamKey, pid)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: isDragOver ? '#dbeafe' : '#fff',
                        borderRadius: 6,
                        padding: '5px 10px',
                        fontWeight: 600,
                        border: '1px solid #ccc',
                        cursor: 'pointer',
                        marginRight: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        opacity: isDragOver ? 0.8 : 1,
                        boxShadow: isDragOver ? '0 0 0 2px #7c3aed' : undefined,
                      }}
                      onClick={() => removePlayerFromTeam(pid)}
                    >
                      <span>{p.name} <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}>({getPlayerAverage(pid)})</span></span>
                      {isCaptain && (
                        <span
                          style={{ background: '#7c3aed', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, marginLeft: 4 }}
                          title="קפטן הקבוצה"
                        >
                          C
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        <button
          onClick={() => {
            if (isEditMode) router.push('/admin');
            else handleBack();
          }}
          style={{ padding: '10px 24px', fontSize: 16, fontWeight: 700, background: '#eee', color: '#222', border: 'none', borderRadius: 8 }}
        >
          {isEditMode ? 'בטל' : 'חזור'}
        </button>
        <button
          onClick={async () => {
            if (isEditMode && editId) {
              // Save changes
              const settings: TournamentSettings = {
                numberOfTeams: step1.numberOfTeams,
                playersPerTeam: step1.playersPerTeam,
                numberOfPitches: step1.numberOfPitches,
              };
              const teamsObj: Record<string, TournamentTeam> = {};
              teamKeys.forEach(k => {
                teamsObj[k] = {
                  key: k,
                  players: teams[k],
                  captain: teams[k][0],
                };
              });
              await updateDoc(doc(db, 'tournaments', editId), {
                date: step1.date,
                settings,
                participants: selectedPlayers,
                teams: teamsObj,
                updatedAt: Date.now(),
              });
              router.push('/admin');
            } else {
              handleNext();
            }
          }}
          disabled={!isTeamsValid()}
          style={{ padding: '10px 24px', fontSize: 16, fontWeight: 700, background: isTeamsValid() ? '#7c3aed' : '#ccc', color: 'white', border: 'none', borderRadius: 8 }}
        >
          {isEditMode ? 'שמור שינויים' : 'הבא'}
        </button>
      </div>
    </div>
  );

  // --- Step 4: Review & Create ---
  const renderStep4 = () => {
    // Build summary data
    const teamKeys = getTeamKeys(step1.numberOfTeams);
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>סקירה וסיום</h2>
        <div style={{ marginBottom: 18 }}>
          <strong>תאריך:</strong> {step1.date}<br />
          <strong>מספר קבוצות:</strong> {step1.numberOfTeams}<br />
          <strong>שחקנים בכל קבוצה:</strong> {step1.playersPerTeam}<br />
          <strong>מספר מגרשים:</strong> {step1.numberOfPitches}
        </div>
        <div style={{ marginBottom: 18 }}>
          <strong>קבוצות:</strong>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            {teamKeys.map(teamKey => (
              <div key={teamKey} style={{ flex: 1, minWidth: 160, background: '#f8fafc', borderRadius: 10, padding: 12, boxShadow: '0 2px 8px #7c3aed11' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>קבוצה {teamKey}</div>
                <div style={{ marginBottom: 4 }}><strong>קפטן:</strong> {players.find(p => p.id === teams[teamKey][0])?.name || '-'}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>שחקנים:</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {teams[teamKey]?.map(pid => {
                    const p = players.find(pl => pl.id === pid);
                    return <li key={pid}>{p?.name || pid}</li>;
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
        {createError && <div style={{ color: 'red', marginBottom: 12 }}>{createError}</div>}
        {createSuccess && <div style={{ color: 'green', marginBottom: 12 }}>הטורניר נוצר בהצלחה!</div>}
        <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
          <button
            onClick={handleBack}
            style={{ padding: '10px 24px', fontSize: 16, fontWeight: 700, background: '#eee', color: '#222', border: 'none', borderRadius: 8 }}
            disabled={creating}
          >
            חזור
          </button>
          <button
            onClick={async () => {
              setCreating(true);
              setCreateError(null);
              setCreateSuccess(false);
              try {
                // Build tournament object
                const settings: TournamentSettings = {
                  numberOfTeams: step1.numberOfTeams,
                  playersPerTeam: step1.playersPerTeam,
                  numberOfPitches: step1.numberOfPitches,
                };
                const teamsObj: Record<string, TournamentTeam> = {};
                teamKeys.forEach(k => {
                  teamsObj[k] = {
                    key: k,
                    players: teams[k],
                    captain: teams[k][0], // Captain is always the first player
                  };
                });
                const tournament: Omit<Tournament, 'id' | 'name'> = {
                  date: step1.date,
                  createdBy: 'admin', // TODO: use real user id
                  status: 1, // 1 = upcoming
                  settings,
                  participants: selectedPlayers,
                  teams: teamsObj,
                  miniGames: [],
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                await addDoc(collection(db, 'tournaments'), {
                  ...tournament,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                setCreateSuccess(true);
                setTimeout(() => {
                  window.location.href = '/admin';
                }, 1200);
              } catch (err: any) {
                setCreateError('שגיאה ביצירת הטורניר: ' + (err.message || err));
              } finally {
                setCreating(false);
              }
            }}
            style={{ padding: '10px 24px', fontSize: 16, fontWeight: 700, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8 }}
            disabled={creating}
          >
            {creating ? 'יוצר...' : 'צור טורניר'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 24 }}>{isEditMode ? 'עריכת טורניר' : 'יצירת טורניר חדש'}</h1>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <span style={{ fontWeight: step === 0 ? 900 : 400 }}>1. פרטי טורניר</span>
          <span style={{ fontWeight: step === 1 ? 900 : 400, color: step > 0 ? '#7c3aed' : '#aaa' }}>2. בחירת שחקנים</span>
          <span style={{ fontWeight: step === 2 ? 900 : 400, color: step > 1 ? '#7c3aed' : '#aaa' }}>3. שיבוץ לקבוצות</span>
          {!isEditMode && <span style={{ fontWeight: step === 3 ? 900 : 400, color: step > 2 ? '#7c3aed' : '#aaa' }}>4. סקירה וסיום</span>}
        </div>
        <div style={{ height: 2, background: '#eee', marginBottom: 24 }}>
          <div style={{ width: `${(step + 1) * (isEditMode ? 33.33 : 25)}%`, height: '100%', background: '#7c3aed', transition: 'width 0.3s' }} />
        </div>
      </div>
      {step === 0 && renderStep1()}
      {step === 1 && renderStep2()}
      {step === 2 && renderStep3()}
      {!isEditMode && step === 3 && renderStep4()}
      {step > 3 && (
        <div style={{ textAlign: 'center', marginTop: 64 }}>
          <p>הטורניר נוצר!</p>
        </div>
      )}
    </div>
  );
} 