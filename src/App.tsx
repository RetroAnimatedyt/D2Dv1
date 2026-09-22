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
  CheckCircle2
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

// --- Cookie Helper Utilities ---
const setCookie = (name: string, value: any, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; expires=${expires}; path=/`;
};

const getCookie = (name: string) => {
  const cookieArr = document.cookie.split('; ');
  for (const cookie of cookieArr) {
    const [key, val] = cookie.split('=');
    if (key === name && val) {
      try {
        return JSON.parse(decodeURIComponent(val));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

// --- Initial Mock Data ---
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
      { id: 'e1', name: 'Barbell Bench Press', setsReps: '4 sets x 8-10 reps', notes: 'Keep elbows tucked at 45 degrees. Focus on slow eccentric motion.', videoUrl: 'https://www.youtube.com/results?search_query=bench+press+form', completed: false },
      { id: 'e2', name: 'Incline Dumbbell Press', setsReps: '3 sets x 10-12 reps', notes: 'Pause slightly at the bottom stretch.', videoUrl: 'https://www.youtube.com/results?search_query=incline+dumbbell+press', completed: false },
      { id: 'e3', name: 'Tricep Rope Pushdowns', setsReps: '3 sets x 12-15 reps', notes: 'Lock shoulders in place, flare rope at bottom.', videoUrl: 'https://www.youtube.com/results?search_query=tricep+rope+pushdown', completed: false }
    ]
  },
  {
    id: 'w2',
    dayOfWeek: 2, // Tuesday
    title: 'Back & Biceps (Pull Day)',
    exercises: [
      { id: 'e4', name: 'Pull-ups / Lat Pulldowns', setsReps: '4 sets x 8-10 reps', notes: 'Pull with elbows down to engage lats.', videoUrl: 'https://www.youtube.com/results?search_query=lat+pulldown+form', completed: false },
      { id: 'e5', name: 'Seated Cable Rows', setsReps: '3 sets x 10-12 reps', notes: 'Squeeze shoulder blades together at full contraction.', videoUrl: 'https://www.youtube.com/results?search_query=seated+cable+row', completed: false }
    ]
  },
  {
    id: 'w3',
    dayOfWeek: 3, // Wednesday
    title: 'Legs & Core',
    exercises: [
      { id: 'e6', name: 'Barbell Squats', setsReps: '4 sets x 6-8 reps', notes: 'Keep chest upright, hit parallel or lower.', videoUrl: 'https://www.youtube.com/results?search_query=barbell+squat+form', completed: false }
    ]
  }
];

export default function App() {
  const todayDateStr = new Date().toISOString().split('T')[0];
  
  // State
  const [activeTab, setActiveTab] = useState<'tasks' | 'workouts'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRoutine[]>([]);
  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>({});
  
  // Modal & Edit states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskScore, setNewTaskScore] = useState<number>(10);
  
  // Workout State
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(new Date().getDay());
  const [editingExercise, setEditingExercise] = useState<{ routineId: string; exercise: Exercise } | null>(null);
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  
  // Calendar State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showEndDaySummary, setShowEndDaySummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{ achieved: number; total: number } | null>(null);

  // Load Initial Cookies
  useEffect(() => {
    const savedLastDate = getCookie('last_visited_date');
    const savedTasks = getCookie('user_tasks') || initialTasks;
    const savedWorkouts = getCookie('user_workouts') || initialWorkouts;
    const savedLogs = getCookie('day_logs') || {};

    // Auto Daily Reset check
    if (savedLastDate && savedLastDate !== todayDateStr) {
      // Reset task checkmarks for the new day
      const resetTasks = savedTasks.map((t: Task) => ({ ...t, completed: false }));
      const resetWorkouts = savedWorkouts.map((w: WorkoutRoutine) => ({
        ...w,
        exercises: w.exercises.map((e: Exercise) => ({ ...e, completed: false }))
      }));
      setTasks(resetTasks);
      setWorkouts(resetWorkouts);
      setCookie('user_tasks', resetTasks);
      setCookie('user_workouts', resetWorkouts);
    } else {
      setTasks(savedTasks);
      setWorkouts(savedWorkouts);
    }

    setDayLogs(savedLogs);
    setCookie('last_visited_date', todayDateStr);
  }, [todayDateStr]);

  // Sync states to cookies
  const saveTasksToCookie = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    setCookie('user_tasks', updatedTasks);
  };

  const saveWorkoutsToCookie = (updatedWorkouts: WorkoutRoutine[]) => {
    setWorkouts(updatedWorkouts);
    setCookie('user_workouts', updatedWorkouts);
  };

  const saveLogsToCookie = (updatedLogs: Record<string, DayLog>) => {
    setDayLogs(updatedLogs);
    setCookie('day_logs', updatedLogs);
  };

  // --- Calculations ---
  const perfectScore = tasks.reduce((acc, curr) => acc + curr.score, 0);
  const currentScore = tasks.filter(t => t.completed).reduce((acc, curr) => acc + curr.score, 0);

  // --- Task Actions ---
  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasksToCookie(updated);
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
    saveTasksToCookie(updated);
    setNewTaskTitle('');
    setNewTaskScore(10);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasksToCookie(updated);
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
    saveTasksToCookie(updated);
  };

  const updateTaskDetails = () => {
    if (!editingTask) return;
    const updated = tasks.map(t => t.id === editingTask.id ? editingTask : t);
    saveTasksToCookie(updated);
    setEditingTask(null);
  };

  // --- End Day Logic ---
  const handleEndDay = () => {
    const log: DayLog = {
      date: todayDateStr,
      scoreAchieved: currentScore,
      scorePossible: perfectScore
    };
    const updatedLogs = { ...dayLogs, [todayDateStr]: log };
    saveLogsToCookie(updatedLogs);
    setSummaryData({ achieved: currentScore, total: perfectScore });
    setShowEndDaySummary(true);
  };

  // --- Workout Actions ---
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
    saveWorkoutsToCookie(updated);
  };

  const addRoutine = () => {
    if (!newRoutineTitle.trim()) return;
    const newRoutine: WorkoutRoutine = {
      id: Date.now().toString(),
      dayOfWeek: selectedDayOfWeek,
      title: newRoutineTitle,
      exercises: []
    };
    saveWorkoutsToCookie([...workouts, newRoutine]);
    setNewRoutineTitle('');
  };

  const deleteRoutine = (routineId: string) => {
    saveWorkoutsToCookie(workouts.filter(w => w.id !== routineId));
  };

  const addExerciseToRoutine = (routineId: string) => {
    const updated = workouts.map(w => {
      if (w.id === routineId) {
        const newEx: Exercise = {
          id: Date.now().toString(),
          name: 'New Exercise',
          setsReps: '3 sets x 10 reps',
          notes: 'Add form cues or target weights here...',
          videoUrl: '',
          completed: false
        };
        return { ...w, exercises: [...w.exercises, newEx] };
      }
      return w;
    });
    saveWorkoutsToCookie(updated);
  };

  const deleteExercise = (routineId: string, exerciseId: string) => {
    const updated = workouts.map(w => {
      if (w.id === routineId) {
        return { ...w, exercises: w.exercises.filter(e => e.id !== exerciseId) };
      }
      return w;
    });
    saveWorkoutsToCookie(updated);
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
    saveWorkoutsToCookie(updated);
    setEditingExercise(null);
  };

  // --- Color Helpers ---
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

  // --- Calendar Helpers ---
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

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8 font-sans max-w-7xl mx-auto flex flex-col">
      {/* --- Top Navigation & Utility Bar --- */}
      <header className="border-2 border-black rounded-[24px] p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2">
          {/* View Switcher Icons */}
          <button 
            onClick={() => setActiveTab('tasks')} 
            title="Daily Tasks"
            className={`p-3 rounded-2xl border-2 border-black transition-all flex items-center gap-2 ${
              activeTab === 'tasks' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
            }`}
          >
            <CalendarIcon size={20} />
            <span className="font-bold text-sm hidden sm:inline">Tasks</span>
          </button>

          <button 
            onClick={() => setActiveTab('workouts')} 
            title="Workout Routines"
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

        {/* Perfect Score Counter */}
        <div className="flex items-center gap-4 bg-gray-50 border-2 border-black rounded-2xl px-4 py-2">
          <div className="flex items-center gap-2">
            <Star size={18} className="fill-black" />
            <span className="text-xs font-bold uppercase tracking-wider">Perfect Score:</span>
          </div>
          <span className="font-mono text-xl font-bold">{perfectScore} pts</span>
        </div>
      </header>

      {/* --- Main Section --- */}
      {activeTab === 'tasks' ? (
        /* TASK LIST & CALENDAR VIEW */
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* Left Container: Task List */}
          <section className="border-2 border-black rounded-[24px] p-6 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">Daily Tasks</h1>
                  <p className="text-xs font-semibold text-gray-500">Score Progress: {currentScore} / {perfectScore} pts</p>
                </div>
              </div>

              {/* Add New Task Form */}
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

              {/* Task List */}
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 font-medium">No tasks yet. Add one above!</p>
                ) : (
                  tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`border-2 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all ${getColorStyle(task.color)}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Custom Squircle Checkbox */}
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
                        {/* Score Tag */}
                        <span className="font-mono text-xs font-bold border-2 border-black rounded-lg px-2 py-0.5 bg-white">
                          +{task.score}
                        </span>

                        {/* Color Switcher */}
                        <button 
                          onClick={() => cycleTaskColor(task.id)}
                          title="Cycle Highlight Color"
                          className="p-1.5 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors text-xs font-bold"
                        >
                          🎨
                        </button>

                        {/* Settings Button */}
                        <button 
                          onClick={() => setEditingTask(task)}
                          className="p-1.5 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Settings size={16} />
                        </button>

                        {/* Quick Delete */}
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* End Day Button */}
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

          {/* Right Container: Calendar View */}
          <section className="border-2 border-black rounded-[24px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex flex-col justify-between">
            {renderCalendar()}
          </section>
        </main>
      ) : (
        /* WORKOUT MANAGER VIEW */
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

          {/* Day of the Week Navigation Tabs */}
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

          {/* Routine List for Selected Day */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{daysOfWeekNames[selectedDayOfWeek]}'s Routines</h2>
            </div>

            {/* Add New Routine Header */}
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder={`Add new routine for ${daysOfWeekNames[selectedDayOfWeek]} (e.g. Push Day, Core & Cardio)...`}
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

            {/* Routines Accordion / Sub-menu */}
            <div className="space-y-4">
              {workouts.filter(w => w.dayOfWeek === selectedDayOfWeek).length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl">
                  <p className="text-gray-400 font-bold">No workout routines scheduled for {daysOfWeekNames[selectedDayOfWeek]}.</p>
                </div>
              ) : (
                workouts.filter(w => w.dayOfWeek === selectedDayOfWeek).map(routine => (
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

                    {/* Sub-menu Exercise List */}
                    <div className="space-y-3">
                      {routine.exercises.length === 0 ? (
                        <p className="text-xs text-gray-400 font-medium italic">No exercises added yet. Click "+ Add Exercise" above.</p>
                      ) : (
                        routine.exercises.map(exercise => (
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
                                  title="Edit Exercise Notes & Link"
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

                            {/* Exercise Notes */}
                            {exercise.notes && (
                              <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 p-2 rounded-lg font-medium">
                                💡 <span className="font-bold">Notes:</span> {exercise.notes}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      )}

      {/* --- Modal: Edit Task Settings --- */}
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

      {/* --- Modal: Edit Exercise Details (Notes & Links) --- */}
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
              <label className="block text-xs font-bold uppercase mb-1">Sets x Reps / Target</label>
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

      {/* --- Modal: End Day Score Summary --- */}
      {showEndDaySummary && summaryData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-black rounded-[24px] p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-4">
            <Trophy size={48} className="mx-auto" />
            <h3 className="text-2xl font-black uppercase">Day Completed!</h3>
            <p className="text-sm font-semibold text-gray-600">You logged your score into browser cookies for today.</p>
            
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
