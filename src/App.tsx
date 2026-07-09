import { useState, useEffect } from 'react';
import { Student, Payment, SyncState, ThemeMode } from './types';
import { initAuth, googleSignIn, logout } from './lib/auth';
import { 
  loadDatabaseFromDrive, 
  saveDatabaseToDrive, 
  downloadRemoteData,
  checkRemoteModification
} from './lib/drive';
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents } from './lib/calendar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { StudentList } from './components/StudentList';
import { StudentForm } from './components/StudentForm';
import { StudentDetail } from './components/StudentDetail';
import { CalendarView } from './components/CalendarView';
import { SyncStatus } from './components/SyncStatus';
import { User } from 'firebase/auth';
import { 
  RefreshCw, 
  CloudLightning, 
  ShieldAlert, 
  Sparkles, 
  Check, 
  Dribbble, 
  LogIn, 
  Dumbbell, 
  Calendar, 
  Users, 
  DollarSign, 
  Activity, 
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  // Navigation / Router Tab state
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Core Data State (Students & Payments)
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Sync / Offline-First / Concurrency State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [studentsFileId, setStudentsFileId] = useState<string>('');
  const [paymentsFileId, setPaymentsFileId] = useState<string>('');
  const [localStudentsModTime, setLocalStudentsModTime] = useState<string>('');
  const [localPaymentsModTime, setLocalPaymentsModTime] = useState<string>('');
  const [syncState, setSyncState] = useState<SyncState>({
    lastSynced: null,
    syncing: false,
    conflict: false,
    conflictData: null,
  });

  // UI Theme settings
  const [theme, setTheme] = useState<ThemeMode>('dark'); // Default to Dark Premium mode per request

  // 1. Theme Syncer
  useEffect(() => {
    const oldTheme = localStorage.getItem('italo_theme');
    if (oldTheme && !localStorage.getItem('apex_theme')) {
      localStorage.setItem('apex_theme', oldTheme);
    }
    const savedTheme = localStorage.getItem('apex_theme') as ThemeMode;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System Theme
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemTheme) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    localStorage.setItem('apex_theme', theme);
  }, [theme]);

  // 2. Offline Detection listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. User Scoped Loading & Session Management
  const loadUserScopedData = (currentUser: any) => {
    if (!currentUser) {
      setStudents([]);
      setPayments([]);
      setStudentsFileId('');
      setPaymentsFileId('');
      setLocalStudentsModTime('');
      setLocalPaymentsModTime('');
      setSyncState(prev => ({
        ...prev,
        lastSynced: null,
        conflict: false,
        conflictData: null,
      }));
      return;
    }

    const emailKey = currentUser.email || currentUser.uid;
    
    // One-off Brand Migration: Migrate local storage from 'italo_' prefix to 'apex_' prefix
    const brandPrefixes = ['students', 'payments', 'st_file_id', 'py_file_id', 'st_mod_time', 'py_mod_time', 'last_synced'];
    brandPrefixes.forEach(suffix => {
      const oldKey = `italo_${suffix}_${emailKey}`;
      const newKey = `apex_${suffix}_${emailKey}`;
      const oldVal = localStorage.getItem(oldKey);
      if (oldVal !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldVal);
      }
    });

    const cachedStudents = localStorage.getItem(`apex_students_${emailKey}`);
    const cachedPayments = localStorage.getItem(`apex_payments_${emailKey}`);
    const lastSynced = localStorage.getItem(`apex_last_synced_${emailKey}`);
    const stFileId = localStorage.getItem(`apex_st_file_id_${emailKey}`) || '';
    const pyFileId = localStorage.getItem(`apex_py_file_id_${emailKey}`) || '';
    const stModTime = localStorage.getItem(`apex_st_mod_time_${emailKey}`) || '';
    const pyModTime = localStorage.getItem(`apex_py_mod_time_${emailKey}`) || '';

    if (cachedStudents) {
      setStudents(JSON.parse(cachedStudents));
    } else {
      setStudents([]);
    }

    if (cachedPayments) {
      setPayments(JSON.parse(cachedPayments));
    } else {
      setPayments([]);
    }

    setStudentsFileId(stFileId);
    setPaymentsFileId(pyFileId);
    setLocalStudentsModTime(stModTime);
    setLocalPaymentsModTime(pyModTime);
    setSyncState(prev => ({
      ...prev,
      lastSynced,
      conflict: false,
      conflictData: null,
    }));
  };

  // Cache changes locally as fallback (Offline-First, scoped per user)
  const updateLocalCache = (updatedStudents: Student[], updatedPayments: Payment[]) => {
    setStudents(updatedStudents);
    setPayments(updatedPayments);
    if (user) {
      const emailKey = user.email || user.uid;
      localStorage.setItem(`apex_students_${emailKey}`, JSON.stringify(updatedStudents));
      localStorage.setItem(`apex_payments_${emailKey}`, JSON.stringify(updatedPayments));
    }
  };

  // 4. Authenticate & Trigger background sync
  useEffect(() => {
    initAuth(
      (authenticatedUser, token) => {
        setUser(authenticatedUser);
        setNeedsAuth(false);
        setLoadingAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setLoadingAuth(false);
      }
    );
  }, []);

  // Sync state transitions when user shifts
  useEffect(() => {
    loadUserScopedData(user);
    if (user && isOnline) {
      handleSyncDrive();
    }
  }, [user]);

  // 5. Auth Logins and Logouts
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Google login failed', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setStudentsFileId('');
    setPaymentsFileId('');
    setLocalStudentsModTime('');
    setLocalPaymentsModTime('');
  };

  // 6. DB Core Sync Engine with Conflict Check
  const handleSyncDrive = async () => {
    if (!user || !isOnline) return;
    
    const emailKey = user.email || user.uid;
    const currentStFileId = localStorage.getItem(`apex_st_file_id_${emailKey}`) || '';
    const currentPyFileId = localStorage.getItem(`apex_py_file_id_${emailKey}`) || '';
    const currentStModTime = localStorage.getItem(`apex_st_mod_time_${emailKey}`) || '';
    const currentPyModTime = localStorage.getItem(`apex_py_mod_time_${emailKey}`) || '';

    setSyncState(prev => ({ ...prev, syncing: true, conflict: false }));
    try {
      const db = await loadDatabaseFromDrive();
      
      // Concurrency / Conflict Check:
      if (currentStFileId && currentPyFileId && currentStModTime && currentPyModTime) {
        const isRemoteStudentsNewer = db.studentsModifiedTime !== currentStModTime;
        const isRemotePaymentsNewer = db.paymentsModifiedTime !== currentPyModTime;

        if (isRemoteStudentsNewer || isRemotePaymentsNewer) {
          // Check if local cached state is different from what we just downloaded
          const localString = localStorage.getItem(`apex_students_${emailKey}`) || '[]';
          const remoteString = JSON.stringify(db.students);
          const localPaymentsString = localStorage.getItem(`apex_payments_${emailKey}`) || '[]';
          const remotePaymentsString = JSON.stringify(db.payments);

          if (localString !== remoteString || localPaymentsString !== remotePaymentsString) {
            // CONFLICT DETECTED!
            setSyncState(prev => ({
              ...prev,
              syncing: false,
              conflict: true,
              conflictData: {
                local: students,
                remote: db.students,
                localPayments: payments,
                remotePayments: db.payments,
                remoteModifiedTime: db.studentsModifiedTime
              }
            }));
            return; // Exit sync to let user choose
          }
        }
      }

      // NO conflict, normal automatic sync merge (remote overrides local since there's no conflict)
      updateLocalCache(db.students, db.payments);
      
      // Update sync references
      setStudentsFileId(db.studentsFileId);
      setPaymentsFileId(db.paymentsFileId);
      setLocalStudentsModTime(db.studentsModifiedTime);
      setLocalPaymentsModTime(db.paymentsModifiedTime);
      
      localStorage.setItem(`apex_st_file_id_${emailKey}`, db.studentsFileId);
      localStorage.setItem(`apex_py_file_id_${emailKey}`, db.paymentsFileId);
      localStorage.setItem(`apex_st_mod_time_${emailKey}`, db.studentsModifiedTime);
      localStorage.setItem(`apex_py_mod_time_${emailKey}`, db.paymentsModifiedTime);
      
      const nowString = new Date().toISOString();
      localStorage.setItem(`apex_last_synced_${emailKey}`, nowString);
      setSyncState({
        lastSynced: nowString,
        syncing: false,
        conflict: false,
        conflictData: null
      });

    } catch (err) {
      console.error('Error synchronizing database:', err);
      setSyncState(prev => ({ ...prev, syncing: false }));
    }
  };

  // 7. Resolve Conflict handler
  const handleResolveConflict = async (resolvedStudents: Student[], resolvedPayments: Payment[]) => {
    if (!user) return;
    const emailKey = user.email || user.uid;
    const currentStFileId = localStorage.getItem(`apex_st_file_id_${emailKey}`) || '';
    const currentPyFileId = localStorage.getItem(`apex_py_file_id_${emailKey}`) || '';

    setSyncState(prev => ({ ...prev, syncing: true, conflict: false }));
    try {
      updateLocalCache(resolvedStudents, resolvedPayments);
      
      // Write resolved dataset directly to Drive
      const updatedTimes = await saveDatabaseToDrive(
        currentStFileId,
        currentPyFileId,
        resolvedStudents,
        resolvedPayments
      );

      setLocalStudentsModTime(updatedTimes.studentsModifiedTime);
      setLocalPaymentsModTime(updatedTimes.paymentsModifiedTime);
      localStorage.setItem(`apex_st_mod_time_${emailKey}`, updatedTimes.studentsModifiedTime);
      localStorage.setItem(`apex_py_mod_time_${emailKey}`, updatedTimes.paymentsModifiedTime);
      
      const nowString = new Date().toISOString();
      localStorage.setItem(`apex_last_synced_${emailKey}`, nowString);
      setSyncState({
        lastSynced: nowString,
        syncing: false,
        conflict: false,
        conflictData: null
      });

    } catch (err) {
      console.error('Conflict resolution save failed:', err);
      alert('Falha ao salvar resolução de conflito no Google Drive.');
      setSyncState(prev => ({ ...prev, syncing: false }));
    }
  };

  // Save current dataset to Drive after editing/actions
  const persistChangesToDrive = async (updatedStudents: Student[], updatedPayments: Payment[]) => {
    updateLocalCache(updatedStudents, updatedPayments);
    
    if (user && isOnline) {
      const emailKey = user.email || user.uid;
      const currentStFileId = localStorage.getItem(`apex_st_file_id_${emailKey}`) || '';
      const currentPyFileId = localStorage.getItem(`apex_py_file_id_${emailKey}`) || '';

      if (currentStFileId && currentPyFileId) {
        try {
          const updatedTimes = await saveDatabaseToDrive(
            currentStFileId,
            currentPyFileId,
            updatedStudents,
            updatedPayments
          );
          
          setLocalStudentsModTime(updatedTimes.studentsModifiedTime);
          setLocalPaymentsModTime(updatedTimes.paymentsModifiedTime);
          localStorage.setItem(`apex_st_mod_time_${emailKey}`, updatedTimes.studentsModifiedTime);
          localStorage.setItem(`apex_py_mod_time_${emailKey}`, updatedTimes.paymentsModifiedTime);
          
          const nowString = new Date().toISOString();
          localStorage.setItem(`apex_last_synced_${emailKey}`, nowString);
          setSyncState(prev => ({ ...prev, lastSynced: nowString }));
        } catch (err) {
          console.error('Failed to sync changes to Google Drive:', err);
        }
      }
    }
  };

  // 8. Student CRUD actions
  const handleSaveStudent = async (studentData: Omit<Student, 'id'> & { id?: string }) => {
    let updatedStudents = [...students];
    let updatedPayments = [...payments];

    if (studentData.id) {
      // EDIT:
      updatedStudents = students.map(s => s.id === studentData.id ? { ...s, ...studentData } as Student : s);
    } else {
      // CREATE:
      const newId = Date.now().toString();
      const newStudent: Student = {
        ...studentData,
        id: newId,
        ativo: true
      };
      updatedStudents.push(newStudent);

      // If pre-marked as paid for the current month:
      if (studentData.pago_este_mes) {
        const newPayment: Payment = {
          id: Date.now().toString() + '-pay',
          student_id: newId,
          nome_aluno: studentData.nome,
          mes_referencia: new Date().toISOString().slice(0, 7),
          data_pagamento: new Date().toISOString().slice(0, 10),
          valor: studentData.valor_mensalidade || 0,
          forma_pagamento: studentData.forma_pagamento || 'Pix',
          status: 'Pago'
        };
        updatedPayments.push(newPayment);
      }
    }

    await persistChangesToDrive(updatedStudents, updatedPayments);
    setCurrentTab('students');
    setSelectedStudentId(null);
  };

  // Delete is deactivation per instruction!
  const handleToggleStudentStatus = async () => {
    if (!selectedStudentId) return;
    const updatedStudents = students.map(s => 
      s.id === selectedStudentId ? { ...s, ativo: !s.ativo } : s
    );
    await persistChangesToDrive(updatedStudents, payments);
  };

  const handleRecordPayment = async (paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...paymentData,
      id: Date.now().toString()
    };
    const updatedPayments = [...payments, newPayment];
    
    // Also update Student pago_este_mes flag to true for the current month if reference is current month
    const currentMonthYear = new Date().toISOString().slice(0, 7);
    let updatedStudents = [...students];
    if (paymentData.mes_referencia === currentMonthYear) {
      updatedStudents = students.map(s => 
        s.id === paymentData.student_id ? { ...s, pago_este_mes: true } : s
      );
    }

    await persistChangesToDrive(updatedStudents, updatedPayments);
  };

  const handleEditPayment = async (paymentId: string, paymentData: Partial<Payment>) => {
    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, ...paymentData } : p
    );
    
    const currentMonthYear = new Date().toISOString().slice(0, 7);
    const targetPayment = payments.find(p => p.id === paymentId);
    let updatedStudents = [...students];
    if (targetPayment) {
      const studentId = targetPayment.student_id;
      const hasPaidCurrentMonth = updatedPayments.some(p => 
        p.student_id === studentId && p.mes_referencia === currentMonthYear && p.status === 'Pago'
      );
      updatedStudents = students.map(s => 
        s.id === studentId ? { ...s, pago_este_mes: hasPaidCurrentMonth } : s
      );
    }
    
    await persistChangesToDrive(updatedStudents, updatedPayments);
  };

  const handleDeletePayment = async (paymentId: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    const updatedPayments = payments.filter(p => p.id !== paymentId);
    
    const currentMonthYear = new Date().toISOString().slice(0, 7);
    const studentId = targetPayment.student_id;
    const hasPaidCurrentMonth = updatedPayments.some(p => 
      p.student_id === studentId && p.mes_referencia === currentMonthYear && p.status === 'Pago'
    );
    const updatedStudents = students.map(s => 
      s.id === studentId ? { ...s, pago_este_mes: hasPaidCurrentMonth } : s
    );

    await persistChangesToDrive(updatedStudents, updatedPayments);
  };

  // Quick Pay shortcut from Dashboard alerts
  const handleQuickPay = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const paymentData: Omit<Payment, 'id'> = {
      student_id: studentId,
      nome_aluno: student.nome,
      mes_referencia: new Date().toISOString().slice(0, 7),
      data_pagamento: new Date().toISOString().slice(0, 10),
      valor: student.valor_mensalidade || 200,
      forma_pagamento: student.forma_pagamento || 'Pix',
      status: 'Pago'
    };

    const newPayment: Payment = {
      ...paymentData,
      id: Date.now().toString()
    };

    const updatedPayments = [...payments, newPayment];
    const updatedStudents = students.map(s => 
      s.id === studentId ? { ...s, pago_este_mes: true } : s
    );

    await persistChangesToDrive(updatedStudents, updatedPayments);
  };

  // 9. Calendar Event Sync & Scheduling
  const handleSyncCalendarEvent = async (student: Student) => {
    if (!student.data_hora_treino) return;
    
    // Clean up any existing Google Calendar event for this student to prevent duplicates
    if (user && isOnline) {
      try {
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 7); // 1 week ago
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 90); // 3 months in the future
        
        const existingEvents = await listCalendarEvents(timeMin.toISOString(), timeMax.toISOString());
        const cleanName = student.nome.toLowerCase();
        
        const matchedEvents = existingEvents.filter(e => {
          const summary = e.summary.toLowerCase();
          return summary === `treino - ${cleanName}` || summary.includes(cleanName);
        });
        
        for (const e of matchedEvents) {
          if (e.id) {
            await deleteCalendarEvent(e.id);
          }
        }
      } catch (err) {
        console.error('Failed to clean up duplicate events during sync:', err);
      }
    }

    const trainingDate = new Date(student.data_hora_treino);
    const endDate = new Date(trainingDate);
    endDate.setHours(trainingDate.getHours() + 1); // 1-hour session default

    await createCalendarEvent({
      summary: `Treino - ${student.nome}`,
      description: `Foco de treino: ${student.treino || 'Treino personalizado'}. Agendado via App do Apex.`,
      start: {
        dateTime: trainingDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      }
    });
  };

  const handleScheduleWorkout = async (studentId: string, dateTime: string, durationMin: number, focus: string) => {
    // 1. Update student object locally
    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          data_hora_treino: dateTime,
          treino: focus || s.treino || ''
        };
      }
      return s;
    });

    await persistChangesToDrive(updatedStudents, payments);

    // 2. If online and has authenticated user, create event on Google Calendar
    if (user && isOnline) {
      const student = updatedStudents.find(s => s.id === studentId);
      if (student) {
        // Clean up any existing Google Calendar event for this student to prevent duplicates
        try {
          const timeMin = new Date();
          timeMin.setDate(timeMin.getDate() - 7); // 1 week ago
          const timeMax = new Date();
          timeMax.setDate(timeMax.getDate() + 90); // 3 months in the future
          
          const existingEvents = await listCalendarEvents(timeMin.toISOString(), timeMax.toISOString());
          const cleanName = student.nome.toLowerCase();
          
          const matchedEvents = existingEvents.filter(e => {
            const summary = e.summary.toLowerCase();
            return summary === `treino - ${cleanName}` || summary.includes(cleanName);
          });
          
          for (const e of matchedEvents) {
            if (e.id) {
              await deleteCalendarEvent(e.id);
            }
          }
        } catch (err) {
          console.error('Failed to clean up duplicate events during schedule:', err);
        }

        const start = new Date(dateTime);
        const end = new Date(start.getTime() + durationMin * 60000);
        
        await createCalendarEvent({
          summary: `Treino - ${student.nome}`,
          description: `Foco de treino: ${focus || student.treino || 'Treino personalizado'}. Agendado via App do Apex.`,
          start: {
            dateTime: start.toISOString(),
          },
          end: {
            dateTime: end.toISOString(),
          }
        });
      }
    }
  };

  const handleCancelWorkout = async (studentId?: string, eventId?: string, studentName?: string, dateTime?: string) => {
    // 1. Clear student's training date/time locally
    let targetStudentId = studentId;
    if (!targetStudentId && studentName) {
      const cleanTargetName = studentName.toLowerCase();
      const matched = students.find(s => {
        const cleanName = s.nome.toLowerCase();
        return cleanName === cleanTargetName ||
               cleanTargetName.includes(cleanName) ||
               cleanName.includes(cleanTargetName);
      });
      if (matched) {
        targetStudentId = matched.id;
      }
    }

    // Fallback: match by dateTime if targetStudentId is still not resolved
    if (!targetStudentId && dateTime) {
      const targetTime = new Date(dateTime).getTime();
      const matched = students.find(s => {
        if (!s.data_hora_treino) return false;
        const localTime = new Date(s.data_hora_treino).getTime();
        return Math.abs(localTime - targetTime) < 300000;
      });
      if (matched) {
        targetStudentId = matched.id;
      }
    }

    const updatedStudents = students.map(s => {
      // Clear for the target student
      if (targetStudentId && s.id === targetStudentId) {
        return { ...s, data_hora_treino: undefined };
      }
      // Safeguard: also clear if dateTime matches and studentName is related
      if (dateTime && s.data_hora_treino) {
        const targetTime = new Date(dateTime).getTime();
        const localTime = new Date(s.data_hora_treino).getTime();
        if (Math.abs(localTime - targetTime) < 300000) {
          if (!studentName || s.nome.toLowerCase().includes(studentName.toLowerCase()) || studentName.toLowerCase().includes(s.nome.toLowerCase())) {
            return { ...s, data_hora_treino: undefined };
          }
        }
      }
      return s;
    });

    await persistChangesToDrive(updatedStudents, payments);

    // 2. Delete Google Calendar event if we have eventId, and clean up any other events for this student
    if (user && isOnline) {
      try {
        if (eventId) {
          await deleteCalendarEvent(eventId);
        }
        
        const searchName = studentName || (targetStudentId ? students.find(s => s.id === targetStudentId)?.nome : undefined);
        if (searchName) {
          const timeMin = new Date();
          timeMin.setDate(timeMin.getDate() - 7);
          const timeMax = new Date();
          timeMax.setDate(timeMax.getDate() + 90);
          
          const existingEvents = await listCalendarEvents(timeMin.toISOString(), timeMax.toISOString());
          const cleanSearchName = searchName.toLowerCase();
          
          const matchedEvents = existingEvents.filter(e => {
            const summary = e.summary.toLowerCase();
            return (summary === `treino - ${cleanSearchName}` || summary.includes(cleanSearchName)) && e.id !== eventId;
          });
          
          for (const e of matchedEvents) {
            if (e.id) {
              await deleteCalendarEvent(e.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to clean up Google Calendar events during cancel:', err);
      }
    }
  };

  // Router dispatcher
  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'student-detail') {
      setSelectedStudentId(null);
    }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center font-sans p-6 text-zinc-900 dark:text-zinc-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-purple-600/10 dark:bg-purple-500/10 border border-purple-500/20 flex items-center justify-center animate-bounce">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold tracking-tight">Portal do Apex</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Verificando Credenciais...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-gradient-to-br dark:from-black dark:via-zinc-950 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200 flex flex-col items-center justify-center font-sans p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/45 backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 rounded-[32px] p-6 sm:p-8 shadow-xl space-y-6 text-center">
          
          {/* Brand/Logo Header */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Dumbbell className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                Apex <span className="text-purple-600 dark:text-purple-400">Management</span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-widest mt-1">
                Training Hub
              </p>
            </div>
          </div>

          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Sua plataforma integrada para cadastros de alunos, controle financeiro, lembretes de cobrança e agendamentos inteligentes.
          </p>

          {/* Core Highlights */}
          <div className="space-y-3 text-left bg-zinc-100/55 dark:bg-white/5 border border-zinc-200/40 dark:border-white/5 rounded-2xl p-4">
            <div className="flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300">
              <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Google Drive Isolado</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-[10px]">Dados salvos de forma 100% segura e privativa no Drive de cada conta logada.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300 border-t border-zinc-200/40 dark:border-white/5 pt-2.5">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Integração Google Agenda</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-[10px]">Agendamento síncrono de aulas com verificação de conflitos em tempo real.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300 border-t border-zinc-200/40 dark:border-white/5 pt-2.5">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Controle Financeiro & WhatsApp</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-[10px]">Histórico de parcelas, emissão de comprovantes e notificações de cobrança.</p>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="pt-2">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 active:scale-98 transition duration-200 cursor-pointer disabled:opacity-75"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  Conectando ao Google...
                </>
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  Acessar com o Google
                </>
              )}
            </button>
            <p className="text-[10px] text-zinc-400 mt-3 flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              Offline-first & Sincronização Automática
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-black dark:via-zinc-950 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200 flex flex-col md:pl-64 pb-20 md:pb-0 font-sans">
      
      {/* Navigation Layout */}
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        theme={theme}
        onThemeChange={setTheme}
        user={user}
        onLogout={handleLogout}
        syncing={syncState.syncing}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* Sync panel status (rendered at top of any page if user is signed in) */}
        <SyncStatus
          syncState={syncState}
          isOnline={isOnline}
          onSync={handleSyncDrive}
          onResolveConflict={handleResolveConflict}
          user={user}
          onLogin={handleGoogleLogin}
        />

        {/* Dynamic Route View rendering */}
        {currentTab === 'dashboard' && (
          <Dashboard
            students={students}
            payments={payments}
            onNavigate={handleNavigate}
            onQuickPay={handleQuickPay}
          />
        )}

        {currentTab === 'students' && (
          <StudentList
            students={students}
            onSelectStudent={(id) => {
              setSelectedStudentId(id);
              setCurrentTab('student-detail');
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'student-detail' && selectedStudent && (
          <StudentDetail
            student={selectedStudent}
            payments={payments}
            onBack={() => handleNavigate('students')}
            onEdit={() => setCurrentTab('edit-student')}
            onToggleStatus={handleToggleStudentStatus}
            onRecordPayment={handleRecordPayment}
            onEditPayment={handleEditPayment}
            onDeletePayment={handleDeletePayment}
            onSyncCalendar={handleSyncCalendarEvent}
          />
        )}

        {currentTab === 'add-student' && (
          <StudentForm
            onSave={handleSaveStudent}
            onCancel={() => handleNavigate('students')}
          />
        )}

        {currentTab === 'edit-student' && selectedStudent && (
          <StudentForm
            student={selectedStudent}
            onSave={handleSaveStudent}
            onCancel={() => setCurrentTab('student-detail')}
          />
        )}

        {currentTab === 'agenda' && (
          <CalendarView
            students={students}
            user={user}
            onSyncCalendar={handleSyncCalendarEvent}
            onScheduleWorkout={handleScheduleWorkout}
            onCancelWorkout={handleCancelWorkout}
          />
        )}
      </main>
    </div>
  );
}
