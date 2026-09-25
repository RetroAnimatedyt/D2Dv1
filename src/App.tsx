import React, { useState, useEffect } from 'react';
import { 
  initGoogleAuth, 
  requestGoogleLogin, 
  findDataFile, 
  loadFromDrive, 
  saveToDrive 
} from './googleDrive';

import { 
  Check, 
  Trash2, 
  Settings, 
  Flame, 
  Target, 
  Trophy, 
  Star, 
  Dumbbell, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Pencil, 
  ExternalLink, 
  X,
  Calendar as CalendarIcon,
  CheckCircle2,
  LogOut
} from 'lucide-react';

// --- Types ---
export type TaskColor = 'none' | 'yellow' | 'blue' | 'green' | 'pink' | 'purple';

export interface Task {
  id: string;
  title: string;
  score: number;
  completed: boolean;
  color: TaskColor;
}

export interface Exercise {
  id: string;
  name: string;
  setsReps: string;
  notes: string;
  videoUrl: string;
  completed: boolean;
}

export interface WorkoutRoutine {
  id: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  title: string;
  exercises: Exercise[];
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  scoreAchieved: number;
  scorePossible: number;
}

// --- Initial Data Fallbacks ---
const initialTasks: Task[] = [
  { id: '1', title: 'Morning Hydration & Stretches', score: 10, completed: false, color: 'blue' },
  { id: '2', title: 'Deep Work Session (2 Hours)', score: 30, completed: false, color: 'purple' },
  { id: '3', title: 'Read 20 Pages', score: 15, completed: false, color: 'yellow' },
  { id: '4', title: 'Clean Workspace', score: 10, completed: false, color: 'green' },
];

const initialWorkouts: WorkoutRoutine[] = [
  {
    id: 'w1',
    dayOfWeek: 1, // Monday
    title: 'Chest & Triceps (Push Day)',
    exercises: [
      { id: 'e1', name: 'Barbell Bench Press', setsReps: '4 sets x 8-10 reps', notes: 'Keep elbows tucked at 45 degrees.', videoUrl: 'https://www.youtube.com/results?search_query=bench+press+form', completed: false },
      { id: 'e2', name: 'Incline Dumbbell Press', setsReps: '3 sets x 10-12 reps', notes: 'Pause slightly at the bottom stretch.', videoUrl: '', completed: false }
    ]
  },
  {
    id: 'w2',
    dayOfWeek: 2, // Tuesday
    title: 'Back & Biceps (Pull Day)',
    exercises: [
      { id: 'e3', name: 'Pull-ups / Lat Pulldowns', setsReps: '4 sets x 8-10 reps', notes: 'Pull with elbows down to engage lats.', videoUrl: '', completed: false }
    ]
  }
];

export default function App() {
  const todayDateStr = new Date().toISOString().split('T')[0];

  // Auth & Drive State
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // App State
  const [activeTab, setActiveTab] = useState<'tasks' | 'workouts'>('tasks');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [workouts, setWorkouts] = useState<WorkoutRoutine[]>(initialWorkouts);
  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>({});

  // UI States
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskScore, setNewTaskScore] = useState<number>(10);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(new Date().getDay());
  const [editingExercise, setEditingExercise] = useState<{ routineId: string; exercise: Exercise } | null>(null);
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showEndDaySummary, setShowEndDaySummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{ achieved: number; total: number } | null>(null);

  // Save to LocalStorage helper
  const saveLocally = (updatedTasks: Task[], updatedWorkouts: WorkoutRoutine[], updatedLogs: Record<string, DayLog>) => {
    localStorage.setItem('my_day_tasks', JSON.stringify(updatedTasks));
    localStorage.setItem('my_day_workouts', JSON.stringify(updatedWorkouts));
    localStorage.setItem('my_day_logs', JSON.stringify(updatedLogs));
  };

  // Load local cache immediately on startup
  useEffect(() => {
    const savedTasks = localStorage.getItem('my_day_tasks');
    const savedWorkouts = localStorage.getItem('my_day_workouts');
    const savedLogs = localStorage.getItem('my_day_logs');

    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedWorkouts) setWorkouts(JSON.parse(savedWorkouts));
    if (savedLogs) setDayLogs(JSON.parse(savedLogs));
  }, []);

  // Sync to Drive and local storage simultaneously
  const syncToDrive = async (
    token = accessToken, 
    fId = fileId, 
    updatedTasks = tasks, 
    updatedWorkouts = workouts, 
    updatedLogs = dayLogs
  ) => {
    saveLocally(updatedTasks, updatedWorkouts, updatedLogs);
    if (!token) return;

    const payload = {
      tasks: updatedTasks,
      workouts: updatedWorkouts,
      dayLogs: updatedLogs,
      lastDate: todayDateStr
    };

    try {
      const savedFileId = await saveToDrive(token, fId, payload);
      if (savedFileId && savedFileId !== fileId) {
        setFileId(savedFileId);
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  // Initialize Google Auth with retry
  useEffect(() => {
    initGoogleAuth(async (token) => {
      setAccessToken(token);
      setIsLoading(true);

      try {
        const existingFileId = await findDataFile(token);
        if (existingFileId) {
          setFileId(existingFileId);
          const data = await loadFromDrive(token, existingFileId);
          if (data) {
            let currentTasks = data.tasks || initialTasks;
            let currentWorkouts = data.workouts || initialWorkouts;
            let currentLogs = data.dayLogs || {};

            if (data.lastDate !== todayDateStr) {
              currentTasks = currentTasks.map((t: Task) => ({ ...t, completed: false }));
              currentWorkouts = currentWorkouts.map((w: WorkoutRoutine) => ({
                ...w,
                exercises: w.exercises.map((e: Exercise) => ({ ...e, completed: false }))
              }));
            }

            setTasks(currentTasks);
            setWorkouts(currentWorkouts);
            setDayLogs(currentLogs);
            saveLocally(currentTasks, currentWorkouts, currentLogs);
          }
        } else {
          const newId = await saveToDrive(token, null, {
            tasks,
            workouts,
            dayLogs,
            lastDate: todayDateStr
          });
          if (newId) setFileId(newId);
        }
      } catch (err) {
        console.error("Error fetching Google Drive state:", err);
      } finally {
        setIsLoading(false);
      }
    });
  }, [todayDateStr]);

  // Calculations
  const perfectScore = tasks.reduce((acc, curr) => acc + curr.score, 0);
  const currentScore = tasks.filter(t => t.completed).reduce((acc, curr) => acc + curr.score, 0);

  // --- Task Handlers ---
  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    syncToDrive(accessToken, fileId, updated, workouts, dayLogs);
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      score: Number(newTaskScore) || 10,
      completed: false,
      color: 'none'
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    setNewTaskTitle('');
    setNewTaskScore(10);
    syncToDrive(accessToken, fileId, updated, workouts, dayLogs);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    syncToDrive(accessToken, fileId, updated, workouts, dayLogs);
  };

  const cycleTaskColor = (id: string) => {
    const colors: TaskColor[] = ['none', 'yellow', 'blue', 'green', 'pink', 'purple'];
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextIndex = (colors.indexOf(t.color) + 1) % colors.length;
        return { ...t, color: colors[nextIndex] };
      }
      return t;
    });
    setTasks(updated);
    syncToDrive(accessToken, fileId, updated, workouts, dayLogs);
  };

  const updateTaskDetails = () => {
    if (!editingTask) return;
    const updated = tasks.map(t => t.id === editingTask.id ? editingTask : t);
    setTasks(updated);
    setEditingTask(null);
    syncToDrive(accessToken, fileId, updated, workouts, dayLogs);
  };

  const handleEndDay = () => {
    const log: DayLog = {
      date: todayDateStr,
      scoreAchieved: currentScore,
      scorePossible: perfectScore
    };
    const updatedLogs = { ...dayLogs, [todayDateStr]: log };
    setDayLogs(updatedLogs);
    setSummaryData({ achieved: currentScore, total: perfectScore });
    setShowEndDaySummary(true);
    syncToDrive(accessToken, fileId, tasks, workouts, updatedLogs);
  };

  // --- Workout Handlers ---
  const toggleExercise = (routineId: string, exerciseId: string) => {
    const updated = workouts.map(w => {
      if (w.id === routineId) {
        return {
          ...w,
          exercises: w.exercises.map(e => e.id === exerciseId ? { ...e, completed: !e.completed } : e)
        };
      }
      return w;
    });
    setWorkouts(updated);
    syncToDrive(accessToken, fileId, tasks, updated, dayLogs);
  };

  const addRoutine = () => {
    if (!newRoutineTitle.trim()) return;
    const newRoutine: WorkoutRoutine = {
      id: Date.now().toString(),
      dayOfWeek: selectedDayOfWeek,
      title: newRoutineTitle,
      exercises: []
    };
    const updated = [...workouts, newRoutine];
    setWorkouts(updated);
    setNewRoutineTitle('');
    syncToDrive(accessToken, fileId, tasks, updated, dayLogs);
  };

  const deleteRoutine = (routineId: string) => {
    const updated = workouts.filter(w => w.id !== routineId);
    setWorkouts(updated);
    syncToDrive(accessToken, fileId, tasks, updated, dayLogs);
  };

  const addExerciseToRoutine = (routineId: string) => {
    const updated = workouts.map(w => {
      if (w.id === routineId) {
        const newEx: Exercise = {
          id: Date.now().toString(),
          name: 'New Exercise',
          setsReps: '3 sets x 10 reps',
          notes: 'Add form cues here...',
          videoUrl: '',
          completed: false
        };
        return { ...w, exercises: [...w.exercises, newEx] };
      }
      return w;
    });
    setWorkouts(updated);
    syncToDrive(accessToken, fileId, tasks, updated, dayLogs);
  };

  const deleteExercise = (routineId: string, exerciseId: string) => {
    const updated = workouts.map(w => {
      if (w.id === routineId) {
        return { ...w, exercises: w.exercises.filter(e => e.id !== exerciseId) };
      }
      return w;
    });
    setWorkouts(updated);
    syncToDrive(accessToken, fileId, tasks, updated, dayLogs);
  };

  const saveExerciseEdits = () => {
    if (!editingExercise) return;
    const { routineId, exercise } = editingExercise;
    const updated = workouts.map(w => {
      if (w.id === routineId) {
        return {
          ...w,
          exercises: w.exercises.map(e => e.id === exercise.id ? exercise : e)
        };
      }
      return w;
    });
    setWorkouts(updated);
    setEditingExercise(null);
    syncToDrive(accessToken, fileId, tasks, updated, dayLogs);
  };

  // Color Styles Helper
  const getColorStyle = (color: TaskColor) => {
    switch (color) {
      case 'yellow': return 'bg-yellow-100 border-yellow-400';
      case 'blue': return 'bg-blue-100 border-blue-400';
      case 'green': return 'bg-green-100 border-green-400';
      case 'pink': return 'bg-pink-100 border-pink-400';
      case 'purple': return 'bg-purple-100 border-purple-400';
      default: return 'bg-white border-black';
    }
  };

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startingDay = firstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const calendarGrid = [];
    for (let i = 0; i < startingDay; i++) {
      calendarGrid.push(<div key={`empty-${i}`} className="h-12 border border-dashed border-gray-200 rounded-lg"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateString === todayDateStr;
      const log = dayLogs[dateString];

      calendarGrid.push(
        <div 
          key={day} 
          className={`h-12 border-2 border-black rounded-xl p-1 flex flex-col justify-between transition-all ${
            isToday ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-bold px-1">
            <span>{day}</span>
            {isToday && <span className="text-[9px] uppercase tracking-widest bg-white text-black px-1 rounded">Today</span>}
          </div>
          {log && (
            <div className={`text-[10px] font-mono px-1 rounded text-center font-bold ${isToday ? 'bg-white text-black' : 'bg-black text-white'}`}>
              {log.scoreAchieved}/{log.scorePossible}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
            className="p-2 border-2 border-black rounded-xl hover:bg-black hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-xl font-bold tracking-tight">{monthNames[month]} {year}</h2>
          <button 
            onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
            className="p-2 border-2 border-black rounded-xl hover:bg-black hover:text-white transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs mb-2">
          {dayNames.map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {calendarGrid}
        </div>
      </div>
    );
  };

  const daysOfWeekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Auth Screen if Not Logged In
  if (!accessToken) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
        <div className="border-2 border-black rounded-[24px] p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-6 bg-white">
          <h1 className="text-3xl font-black uppercase tracking-tight">My Day App</h1>
          <p className="text-xs font-bold text-gray-500 leading-relaxed">
            Sign in with your Google account to sync your daily tasks and workout routines directly to your Google Drive.
          </p>

          <button 
            onClick={requestGoogleLogin}
            className="w-full bg-black text-white font-bold py-4 rounded-2xl border-2 border-black hover:bg-gray-800 transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8 font-sans max-w-7xl mx-auto flex flex-col">
      {/* Header Bar */}
      <header className="border-2 border-black rounded-[24px] p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`p-3 rounded-2xl border-2 border-black transition-all flex items-center gap-2 ${
              activeTab === 'tasks' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
            }`}
          >
            <CalendarIcon size={20} />
            <span className="font-bold text-sm hidden sm:inline">Tasks</span>
          </button>

          <button 
            onClick={() => setActiveTab('workouts')} 
            className={`p-3 rounded-2xl border-2 border-black transition-all flex items-center gap-2 ${
              activeTab === 'workouts' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
            }`}
          >
            <Dumbbell size={20} />
            <span className="font-bold text-sm hidden sm:inline">Workouts</span>
          </button>

          <div className="h-6 w-[2px] bg-black mx-1"></div>

          <button className="p-3 border-2 border-black rounded-2xl hover:bg-black hover:text-white transition-colors"><Flame size={20} /></button>
          <button className="p-3 border-2 border-black rounded-2xl hover:bg-black hover:text-white transition-colors"><Target size={20} /></button>
          <button className="p-3 border-2 border-black rounded-2xl hover:bg-black hover:text-white transition-colors"><Trophy size={20} /></button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border-2 border-black rounded-2xl px-3 py-2">
            <Star size={18} className="fill-black" />
            <span className="font-mono text-sm font-bold">{perfectScore} pts</span>
          </div>

          <button 
            onClick={() => { setAccessToken(null); setFileId(null); }}
            title="Sign Out"
            className="p-2.5 border-2 border-black rounded-2xl hover:bg-black hover:text-white transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main View */}
      {activeTab === 'tasks' ? (
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* Task List Section */}
          <section className="border-2 border-black rounded-[24px] p-6 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">Daily Tasks</h1>
                  <p className="text-xs font-semibold text-gray-500">Score Progress: {currentScore} / {perfectScore} pts</p>
                </div>
                {isLoading && <span className="text-xs font-bold text-gray-400 animate-pulse">Syncing Drive...</span>}
              </div>

              {/* Add Task Bar */}
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  placeholder="Add new task..." 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  className="flex-1 border-2 border-black rounded-xl px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-black"
                />
                <input 
                  type="number" 
                  placeholder="Pts" 
                  value={newTaskScore}
                  onChange={(e) => setNewTaskScore(Number(e.target.value))}
                  className="w-20 border-2 border-black rounded-xl px-3 py-2 font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button 
                  onClick={addTask}
                  className="bg-black text-white border-2 border-black rounded-xl px-4 py-2 font-bold hover:bg-gray-800 transition-colors flex items-center justify-center"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* List */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`border-2 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all ${getColorStyle(task.color)}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className={`w-7 h-7 border-2 border-black rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                          task.completed ? 'bg-black text-white' : 'bg-white'
                        }`}
                      >
                        {task.completed && <Check size={18} strokeWidth={3} />}
                      </button>
                      <span className={`font-semibold truncate ${task.completed ? 'line-through text-gray-500' : 'text-black'}`}>
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold border-2 border-black rounded-lg px-2 py-0.5 bg-white">
                        +{task.score}
                      </span>

                      <button 
                        onClick={() => cycleTaskColor(task.id)}
                        className="p-1.5 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors text-xs font-bold"
                      >
                        🎨
                      </button>

                      <button 
                        onClick={() => setEditingTask(task)}
                        className="p-1.5 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Settings size={16} />
                      </button>

                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t-2 border-black mt-6">
              <button 
                onClick={handleEndDay}
                className="w-full bg-black text-white font-black text-lg py-4 rounded-2xl border-2 border-black hover:bg-gray-800 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={22} />
                End Day & Log Scores
              </button>
            </div>
          </section>

          {/* Calendar Section */}
          <section className="border-2 border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex flex-col justify-between">
            {renderCalendar()}
          </section>
        </main>
      ) : (
        /* Workouts View */
        <main className="border-2 border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex-1 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-black">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Dumbbell size={28} /> Workout Routine Manager
              </h1>
              <p className="text-xs font-semibold text-gray-500">Organize exercises, notes, form cues, and video links by day of week.</p>
            </div>

            <button 
              onClick={() => setSelectedDayOfWeek(new Date().getDay())}
              className="px-4 py-2 border-2 border-black rounded-xl font-bold text-xs bg-gray-100 hover:bg-black hover:text-white transition-colors"
            >
              Jump to Today ({daysShort[new Date().getDay()]})
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-6">
            {daysShort.map((dayName, idx) => {
              const isSelected = selectedDayOfWeek === idx;
              const isToday = new Date().getDay() === idx;

              return (
                <button
                  key={dayName}
                  onClick={() => setSelectedDayOfWeek(idx)}
                  className={`py-3 rounded-2xl border-2 border-black font-bold text-sm transition-all flex flex-col items-center justify-center ${
                    isSelected ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <span>{dayName}</span>
                  {isToday && <span className={`text-[9px] uppercase font-mono px-1 rounded ${isSelected ? 'bg-white text-black' : 'bg-black text-white'}`}>Today</span>}
                </button>
              );
            })}
          </div>

          <div className="flex-1 space-y-6">
            <h2 className="text-xl font-bold">{daysOfWeekNames[selectedDayOfWeek]}'s Routines</h2>

            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder={`Add new routine for ${daysOfWeekNames[selectedDayOfWeek]}...`}
                value={newRoutineTitle}
                onChange={(e) => setNewRoutineTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRoutine()}
                className="flex-1 border-2 border-black rounded-xl px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button 
                onClick={addRoutine}
                className="bg-black text-white border-2 border-black rounded-xl px-5 py-2 font-bold hover:bg-gray-800 transition-colors flex items-center gap-1"
              >
                <Plus size={18} /> Add Routine
              </button>
            </div>

            <div className="space-y-4">
              {workouts.filter(w => w.dayOfWeek === selectedDayOfWeek).map(routine => (
                <div key={routine.id} className="border-2 border-black rounded-2xl p-4 bg-gray-50 space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-black pb-3">
                    <h3 className="text-lg font-bold">{routine.title}</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => addExerciseToRoutine(routine.id)}
                        className="px-3 py-1.5 border-2 border-black rounded-xl bg-white text-xs font-bold hover:bg-black hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Exercise
                      </button>
                      <button 
                        onClick={() => deleteRoutine(routine.id)}
                        className="p-1.5 border-2 border-black rounded-xl bg-white hover:bg-black hover:text-white transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {routine.exercises.map(exercise => (
                      <div key={exercise.id} className="border-2 border-black rounded-xl p-3 bg-white space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleExercise(routine.id, exercise.id)}
                              className={`w-6 h-6 border-2 border-black rounded-md flex items-center justify-center transition-colors ${
                                exercise.completed ? 'bg-black text-white' : 'bg-white'
                              }`}
                            >
                              {exercise.completed && <Check size={14} strokeWidth={3} />}
                            </button>
                            <span className={`font-bold text-sm ${exercise.completed ? 'line-through text-gray-400' : ''}`}>
                              {exercise.name}
                            </span>
                            <span className="text-xs font-mono bg-gray-100 border border-black rounded px-2 py-0.5 font-bold">
                              {exercise.setsReps}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {exercise.videoUrl && (
                              <a 
                                href={exercise.videoUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-2 py-1 border-2 border-black rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-black hover:text-white transition-colors"
                              >
                                <ExternalLink size={12} /> Tutorial
                              </a>
                            )}
                            <button 
                              onClick={() => setEditingExercise({ routineId: routine.id, exercise })}
                              className="p-1.5 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button 
                              onClick={() => deleteExercise(routine.id, exercise.id)}
                              className="p-1.5 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {exercise.notes && (
                          <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 p-2 rounded-lg font-medium">
                            💡 <span className="font-bold">Notes:</span> {exercise.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Task Settings Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-black rounded-[24px] p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-3">
              <h3 className="text-lg font-bold">Task Settings</h3>
              <button onClick={() => setEditingTask(null)}><X size={20} /></button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Task Title</label>
              <input 
                type="text" 
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className="w-full border-2 border-black rounded-xl p-2 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Score Amount</label>
              <input 
                type="number" 
                value={editingTask.score}
                onChange={(e) => setEditingTask({ ...editingTask, score: Number(e.target.value) })}
                className="w-full border-2 border-black rounded-xl p-2 font-mono font-bold"
              />
            </div>

            <button 
              onClick={updateTaskDetails}
              className="w-full bg-black text-white font-bold py-3 rounded-xl border-2 border-black hover:bg-gray-800 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {editingExercise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-black rounded-[24px] p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-3">
              <h3 className="text-lg font-bold">Edit Exercise Details</h3>
              <button onClick={() => setEditingExercise(null)}><X size={20} /></button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Exercise Name</label>
              <input 
                type="text" 
                value={editingExercise.exercise.name}
                onChange={(e) => setEditingExercise({
                  ...editingExercise,
                  exercise: { ...editingExercise.exercise, name: e.target.value }
                })}
                className="w-full border-2 border-black rounded-xl p-2 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Sets x Reps</label>
              <input 
                type="text" 
                value={editingExercise.exercise.setsReps}
                onChange={(e) => setEditingExercise({
                  ...editingExercise,
                  exercise: { ...editingExercise.exercise, setsReps: e.target.value }
                })}
                className="w-full border-2 border-black rounded-xl p-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Form Notes / Cues</label>
              <textarea 
                rows={3}
                value={editingExercise.exercise.notes}
                onChange={(e) => setEditingExercise({
                  ...editingExercise,
                  exercise: { ...editingExercise.exercise, notes: e.target.value }
                })}
                className="w-full border-2 border-black rounded-xl p-2 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Video Tutorial URL</label>
              <input 
                type="url" 
                placeholder="https://youtube.com/..."
                value={editingExercise.exercise.videoUrl}
                onChange={(e) => setEditingExercise({
                  ...editingExercise,
                  exercise: { ...editingExercise.exercise, videoUrl: e.target.value }
                })}
                className="w-full border-2 border-black rounded-xl p-2 text-sm font-mono"
              />
            </div>

            <button 
              onClick={saveExerciseEdits}
              className="w-full bg-black text-white font-bold py-3 rounded-xl border-2 border-black hover:bg-gray-800 transition-colors"
            >
              Save Exercise
            </button>
          </div>
        </div>
      )}

      {/* Score Summary Modal */}
      {showEndDaySummary && summaryData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-black rounded-[24px] p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-4">
            <Trophy size={48} className="mx-auto" />
            <h3 className="text-2xl font-black uppercase">Day Completed!</h3>
            <p className="text-sm font-semibold text-gray-600">Your score for today has been logged to your Google Drive.</p>
            
            <div className="border-2 border-black rounded-2xl p-4 bg-gray-50">
              <span className="text-xs uppercase font-bold tracking-widest block text-gray-500">Final Score</span>
              <span className="font-mono text-4xl font-black">{summaryData.achieved} / {summaryData.total}</span>
            </div>

            <button 
              onClick={() => setShowEndDaySummary(false)}
              className="w-full bg-black text-white font-bold py-3 rounded-xl border-2 border-black hover:bg-gray-800 transition-colors"
            >
              Close & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}