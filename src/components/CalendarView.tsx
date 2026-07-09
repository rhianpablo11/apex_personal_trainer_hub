import React, { useEffect, useState, useMemo } from 'react';
import { listCalendarEvents, CalendarEvent, deleteCalendarEvent } from '../lib/calendar';
import { Student } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  User, 
  X, 
  Check, 
  Sparkles, 
  Timer, 
  Search, 
  MessageCircle, 
  CalendarDays, 
  CheckCircle2, 
  Info, 
  Activity,
  ArrowRight
} from 'lucide-react';

interface CalendarViewProps {
  students: Student[];
  user: any;
  onSyncCalendar: (student: Student) => void;
  onScheduleWorkout: (studentId: string, dateTime: string, durationMin: number, focus: string) => Promise<void>;
  onCancelWorkout: (studentId?: string, eventId?: string, studentName?: string, dateTime?: string) => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  students,
  user,
  onSyncCalendar,
  onScheduleWorkout,
  onCancelWorkout,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic loading overlay states for cancel/schedule operations
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Filter and search states
  const [activeFilter, setActiveFilter] = useState<'today' | 'tomorrow' | 'week' | 'all'>('week');
  const [searchQuery, setSearchQuery] = useState('');

  // Scheduling Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal Form Fields
  const [formStudentId, setFormStudentId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDuration, setFormDuration] = useState(60); // minutes
  const [formFocus, setFormFocus] = useState('Hipertrofia Geral');
  const [customFocus, setCustomFocus] = useState('');

  // Default Focus suggestions
  const focusSuggestions = [
    'Hipertrofia Geral',
    'Leg Day / Pernas',
    'Peito e Tríceps',
    'Costas e Bíceps',
    'Membros Superiores',
    'Cardio / Funcional',
    'Core e Abdômen'
  ];

  const today = new Date();
  
  // Date range calculations for weekly calendar view
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7); // Next Sunday
  endOfWeek.setHours(23, 59, 59, 999);

  // Fetch from Google Calendar
  const fetchCalendar = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const gEvents = await listCalendarEvents(startOfWeek.toISOString(), endOfWeek.toISOString());
      // Filter training events (events containing "Treino" or tagged by App) and omit recently deleted ones
      setEvents(gEvents.filter(e => 
        (e.summary.toLowerCase().includes('treino') || 
         e.description?.toLowerCase().includes('italo') ||
         e.description?.toLowerCase().includes('apex')) &&
        (!e.id || !deletedEventIds.has(e.id))
      ));
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível sincronizar com a sua Google Agenda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCalendar();
    }
  }, [user]);

  // Merge events and local schedule seamlessly
  const mergedAgenda = useMemo(() => {
    const list: any[] = [];
    const activeEvents = events.filter(e => !e.id || !deletedEventIds.has(e.id));
    const eventSummaries = new Set(activeEvents.map(e => e.summary.toLowerCase()));

    // 1. Add Google Calendar events (they already represent synced students)
    activeEvents.forEach(e => {
      // Find associated student by parsing summary e.g. "Treino - João"
      let student: Student | undefined;
      const cleanSummary = e.summary.toLowerCase();
      student = students.find(s => {
        const cleanName = s.nome.toLowerCase();
        if (cleanSummary === `treino - ${cleanName}`) return true;
        if (cleanSummary.includes(cleanName)) return true;
        
        // Match first name or parts
        if (cleanSummary.startsWith('treino - ')) {
          const namePart = cleanSummary.slice(9).trim();
          if (namePart.length > 2 && (cleanName.includes(namePart) || namePart.includes(cleanName))) return true;
        }
        return false;
      });

      list.push({
        id: e.id,
        summary: e.summary,
        description: e.description || '',
        start: e.start.dateTime,
        isGoogleEvent: true,
        studentId: student?.id,
        studentName: student?.nome || e.summary.replace('Treino - ', ''),
        studentPhone: student?.whatsapp || '',
        studentFocus: student?.treino || '',
        rawStudent: student,
        rawEvent: e
      });
    });

    // 2. Add local training schedules that aren't already represented in Google Calendar to avoid double entries
    students
      .filter(s => s.ativo && s.data_hora_treino)
      .forEach(s => {
        const expectedSummary = `Treino - ${s.nome}`.toLowerCase();
        // Check if there is already a Google Calendar event for this student on the same day/time
        const isAlreadySynced = events.some(e => {
          if (e.summary.toLowerCase() !== expectedSummary) return false;
          try {
            const eventTime = new Date(e.start.dateTime).getTime();
            const localTime = new Date(s.data_hora_treino!).getTime();
            // Match within 5 minutes tolerance
            return Math.abs(eventTime - localTime) < 300000;
          } catch {
            return false;
          }
        });

        if (!isAlreadySynced) {
          list.push({
            id: `local-${s.id}`,
            summary: `Treino - ${s.nome}`,
            description: s.treino || 'Treino personalizado',
            start: s.data_hora_treino!,
            isGoogleEvent: false,
            studentId: s.id,
            studentName: s.nome,
            studentPhone: s.whatsapp || '',
            studentFocus: s.treino || '',
            rawStudent: s
          });
        }
      });

    // Sort by start datetime
    return list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, students, deletedEventIds]);

  // Apply filters and searches
  const filteredAgenda = useMemo(() => {
    return mergedAgenda.filter(item => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.studentName.toLowerCase().includes(q);
        const matchesFocus = item.description?.toLowerCase().includes(q) || item.studentFocus.toLowerCase().includes(q);
        if (!matchesName && !matchesFocus) return false;
      }

      // 2. Active Filter Tab
      const itemDate = new Date(item.start);
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      if (activeFilter === 'today') {
        return itemDate >= startOfToday && itemDate <= endOfToday;
      }

      if (activeFilter === 'tomorrow') {
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfToday.getDate() + 1);
        const endOfTomorrow = new Date(endOfToday);
        endOfTomorrow.setDate(endOfToday.getDate() + 1);
        return itemDate >= startOfTomorrow && itemDate <= endOfTomorrow;
      }

      if (activeFilter === 'week') {
        // Keep upcoming trainings of this week (from start of today till end of week)
        return itemDate >= startOfToday && itemDate <= endOfWeek;
      }

      // 'all' tab showing upcoming
      return itemDate >= startOfToday;
    });
  }, [mergedAgenda, activeFilter, searchQuery, endOfWeek]);

  // Conflict Detection Logic (Checks overlap of Proposed Dates)
  const bookingConflict = useMemo(() => {
    if (!formDate || !formTime || !formStudentId) return null;
    
    try {
      const proposedStart = new Date(`${formDate}T${formTime}`);
      if (isNaN(proposedStart.getTime())) return null;
      
      const proposedEnd = new Date(proposedStart.getTime() + formDuration * 60000);

      // 1. Check database conflict (all other scheduled active students)
      const dbConflict = students.find(s => {
        if (!s.ativo || s.id === formStudentId || !s.data_hora_treino) return false;
        try {
          const workoutStart = new Date(s.data_hora_treino);
          const workoutEnd = new Date(workoutStart.getTime() + 60 * 60000); // Assume default 1 hour
          return proposedStart < workoutEnd && proposedEnd > workoutStart;
        } catch {
          return false;
        }
      });

      if (dbConflict) {
        return {
          type: 'Aluno' as const,
          name: dbConflict.nome,
          detail: `Já possui um treino agendado às ${new Date(dbConflict.data_hora_treino!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        };
      }

      // 2. Check Google Agenda conflict
      const agendaConflict = events.find(e => {
        try {
          const start = new Date(e.start.dateTime);
          const end = new Date(e.end.dateTime || start.getTime() + 60 * 60000);
          
          // Exclude the student if they are already scheduled at this slot
          const studentName = students.find(s => s.id === formStudentId)?.nome || '';
          if (studentName && e.summary.toLowerCase().includes(studentName.toLowerCase())) return false;

          return proposedStart < end && proposedEnd > start;
        } catch {
          return false;
        }
      });

      if (agendaConflict) {
        return {
          type: 'Google Agenda' as const,
          name: agendaConflict.summary,
          detail: `Compromisso agendado das ${new Date(agendaConflict.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até ${new Date(agendaConflict.end.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [formDate, formTime, formStudentId, formDuration, students, events]);

  // Weekly occupancy statistics
  const occupancyStats = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    mergedAgenda.forEach(item => {
      try {
        const d = new Date(item.start);
        counts[d.getDay()] += 1;
      } catch {}
    });

    return days.map((day, idx) => ({
      day,
      count: counts[idx]
    }));
  }, [mergedAgenda]);

  // Students with pending schedule list
  const pendingStudents = useMemo(() => {
    return students.filter(s => s.ativo && !s.data_hora_treino);
  }, [students]);

  // Open modal prefilled for a student
  const openSchedulerForStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setFormStudentId(studentId);
    
    // Default date and hour prefill
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const hour = now.getHours().toString().padStart(2, '0');
    
    setFormDate(localDate);
    setFormTime(`${hour}:00`);
    setFormDuration(60);
    setFormFocus(student.treino || 'Hipertrofia Geral');
    setCustomFocus('');
    setIsModalOpen(true);
  };

  // Open blank scheduler
  const openNewScheduler = () => {
    const activeStudentsList = students.filter(s => s.ativo);
    if (activeStudentsList.length > 0) {
      setFormStudentId(activeStudentsList[0].id);
    } else {
      setFormStudentId('');
    }

    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    
    setFormDate(localDate);
    setFormTime('08:00');
    setFormDuration(60);
    setFormFocus('Hipertrofia Geral');
    setCustomFocus('');
    setIsModalOpen(true);
  };

  // Save the appointment
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId || !formDate || !formTime) {
      alert('Por favor, preencha o aluno, a data e o horário.');
      return;
    }

    const student = students.find(s => s.id === formStudentId);
    const sName = student?.nome || '';

    setSubmitting(true);
    setIsProcessing(true);
    setProcessingMessage(`Sincronizando e agendando treino de ${sName}...`);

    try {
      const selectedFocus = formFocus === 'Outro' ? customFocus : formFocus;
      const combinedDateTime = `${formDate}T${formTime}`;
      
      // Find any existing event for this student in our calendar state to optimistically hide it
      if (student) {
        const cleanName = student.nome.toLowerCase();
        const existingEvent = events.find(evt => {
          const summary = evt.summary.toLowerCase();
          return summary === `treino - ${cleanName}` || summary.includes(cleanName);
        });
        
        if (existingEvent && existingEvent.id) {
          setDeletedEventIds(prev => {
            const next = new Set(prev);
            next.add(existingEvent.id!);
            return next;
          });
        }
      }
      
      await onScheduleWorkout(formStudentId, combinedDateTime, formDuration, selectedFocus);
      
      // Auto success toast
      setSuccessMessage(`Treino de ${sName} agendado com sucesso!`);
      
      // Refresh Google Calendar events
      if (user) {
        await fetchCalendar();
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao realizar o agendamento: ' + err.message);
    } finally {
      setSubmitting(false);
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Cancel workout
  const handleCancelWorkoutSession = async (studentId?: string, eventId?: string, studentName?: string, dateTime?: string) => {
    const name = studentName || students.find(s => s.id === studentId)?.nome || 'aluno';
    const confirm = window.confirm(`Deseja desmarcar o treino do(a) ${name}?`);
    if (!confirm) return;

    setIsProcessing(true);
    setProcessingMessage(`Cancelando agendamento de ${name} e atualizando bases...`);

    try {
      await onCancelWorkout(studentId, eventId, name, dateTime);
      
      // Update local state dynamically
      if (eventId) {
        setDeletedEventIds(prev => {
          const next = new Set(prev);
          next.add(eventId);
          return next;
        });
        setEvents(prev => prev.filter(e => e.id !== eventId));
      }
      
      // Refresh Google Calendar events to make sure everything is perfectly synced
      if (user) {
        await fetchCalendar();
      }
      
      // Show mini toast
      setSuccessMessage(`Treino do(a) ${name} cancelado.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao desmarcar o treino: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Format helper for Portuguese locale
  const formatEventDate = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    try {
      const d = new Date(dateTimeStr);
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      const dayAndMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayAndMonth}`;
    } catch {
      return '';
    }
  };

  const formatEventTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    try {
      const d = new Date(dateTimeStr);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Calculate workout end time label
  const calculateEndTime = (startStr: string, durationMin: number = 60) => {
    try {
      const start = new Date(startStr);
      const end = new Date(start.getTime() + durationMin * 60000);
      return end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Send Whatsapp reminder message helper
  const getWhatsAppReminderLink = (studentName: string, phone: string, dateTimeStr: string, focus: string) => {
    const formattedPhone = phone.replace(/\D/g, '');
    const d = new Date(dateTimeStr);
    const dateFormatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const timeFormatted = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const focusMsg = focus ? ` focado em *${focus}*` : '';
    const message = `E aí, ${studentName}! Passando para confirmar nosso treino agendado para o dia *${dateFormatted}* às *${timeFormatted}*h${focusMsg}. Conto com você! Bora pra cima! 💪🏋️`;
    return `https://api.whatsapp.com/send?phone=55${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Success Notification & Loading Overlay */}
      <AnimatePresence mode="popLayout">
        {successMessage && (
          <motion.div 
            key="success-toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20 text-sm font-bold border border-emerald-500/30"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div
            key="processing-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/75 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-5 text-center p-6"
          >
            <div className="relative flex items-center justify-center">
              {/* Pulsing glow behind */}
              <div className="absolute w-24 h-24 border-4 border-purple-500/15 rounded-full animate-ping" />
              {/* Spinning main ring */}
              <div className="w-20 h-20 border-4 border-t-purple-600 border-r-transparent border-b-purple-600/20 border-l-transparent rounded-full animate-spin" />
              {/* Center icon wrapper */}
              <div className="absolute p-4 bg-purple-600/15 rounded-full text-purple-400">
                <CalendarIcon className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2 max-w-sm">
              <h3 className="font-display font-black text-xl text-zinc-50 tracking-tight">
                Apex Personal
              </h3>
              <p className="text-zinc-300 text-sm font-medium leading-relaxed">
                {processingMessage || 'Processando agendamento...'}
              </p>
              <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-xs mt-1">
                <Clock className="w-3.5 h-3.5 animate-spin duration-3000" />
                <span>Sincronizando com o Google Calendar & Drive...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-white/5 p-6 rounded-[32px] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-600/10 rounded-lg text-purple-600 dark:text-purple-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Agenda Integrada</h2>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
            Agendamentos de aulas sincronizados em tempo real com a Google Agenda do seu celular.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {user && (
            <button
              onClick={fetchCalendar}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 rounded-2xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              title="Sincronizar com Google Agenda"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar Agenda
            </button>
          )}

          <button
            onClick={openNewScheduler}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition cursor-pointer shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            Agendar Treino
          </button>
        </div>
      </div>

      {/* Grid: 3-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Stats & Quick action panel) - Span 4 */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Quick Stats: Weekly occupancy insight */}
          <div className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 shadow-sm space-y-4">
            <h4 className="font-display font-black text-xs text-zinc-900 dark:text-zinc-50 uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-purple-500 animate-pulse" />
              Ocupação da Semana
            </h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              Resumo da distribuição de treinos nos dias da semana para otimizar seus horários:
            </p>

            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {occupancyStats.map((stat, i) => {
                const maxCount = Math.max(...occupancyStats.map(s => s.count), 1);
                const pct = (stat.count / maxCount) * 100;
                const isToday = today.getDay() === i;

                return (
                  <div key={stat.day} className="flex flex-col items-center space-y-2">
                    <div className="h-20 w-full bg-zinc-100/60 dark:bg-white/5 border border-zinc-200/30 dark:border-white/5 rounded-xl flex items-end overflow-hidden">
                      <div 
                        style={{ height: `${pct || 4}%` }}
                        className={`w-full transition-all duration-500 rounded-t-lg ${stat.count > 0 ? 'bg-purple-600 dark:bg-purple-500' : 'bg-purple-300/20'}`}
                      />
                    </div>
                    <div className="text-center">
                      <span className={`text-[9px] font-black uppercase ${isToday ? 'text-purple-600 dark:text-purple-400 font-extrabold underline decoration-2' : 'text-zinc-400'}`}>
                        {stat.day}
                      </span>
                      <span className="block text-[10px] font-bold text-zinc-800 dark:text-zinc-300 mt-0.5">
                        {stat.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Students with pending schedules */}
          <div className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-white/5 rounded-[32px] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-black text-xs text-zinc-900 dark:text-zinc-50 uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Timer className="w-4.5 h-4.5 text-purple-500" />
                Sem Treino Agendado ({pendingStudents.length})
              </h4>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
              Estes alunos ativos não possuem nenhum treino agendado para os próximos dias:
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {pendingStudents.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-400 italic">
                  Todos os alunos ativos estão agendados! ✨
                </div>
              ) : (
                pendingStudents.map(student => (
                  <div 
                    key={student.id} 
                    className="bg-zinc-100/50 dark:bg-white/5 p-3 rounded-2xl border border-zinc-200/50 dark:border-white/5 flex items-center justify-between text-xs gap-3 group hover:border-purple-500/20 transition-all duration-200"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{student.nome}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Horário padrão: {student.horario || 'Não definido'}</p>
                    </div>
                    
                    <button
                      onClick={() => openSchedulerForStudent(student.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white rounded-xl transition duration-150 cursor-pointer font-bold text-[10px] uppercase"
                    >
                      Agendar
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column (List of appointments with search/tabs filters) - Span 8 */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Controls: Filter tabs & Search Bar */}
          <div className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-white/5 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {(['week', 'today', 'tomorrow', 'all'] as const).map(tab => {
                const labels = {
                  week: 'Esta Semana',
                  today: 'Hoje',
                  tomorrow: 'Amanhã',
                  all: 'Todos Próximos'
                };
                const active = activeFilter === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition duration-200 whitespace-nowrap cursor-pointer ${active ? 'bg-purple-600 text-white shadow-md shadow-purple-500/10' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por aluno ou foco..."
                className="w-full md:w-64 pl-9 pr-4 py-2 bg-zinc-100/70 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-2xl text-xs text-zinc-850 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1.5 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Agenda Session List Card */}
          <div className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-white/5 rounded-[32px] p-6 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
              <h3 className="font-display font-black text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                Treinos Encontrados ({filteredAgenda.length})
              </h3>
              
              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase border ${user && !error ? 'bg-purple-500/10 border-purple-200/30 text-purple-700 dark:text-purple-300' : 'bg-amber-500/10 border-amber-200/30 text-amber-700 dark:text-amber-300'}`}>
                {user && !error ? 'Sincronizado' : 'Offline Mode'}
              </span>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-200/20 dark:border-amber-900/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-850 dark:text-amber-300">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <p className="font-bold">Google Agenda Offline</p>
                  <p className="text-[10px] mt-0.5 opacity-80">Sua agenda da conta Google não pôde ser carregada. Mostrando dados locais guardados de forma segura offline.</p>
                </div>
              </div>
            )}

            {/* List entries */}
            {filteredAgenda.length === 0 ? (
              <div className="py-24 text-center space-y-2">
                <CalendarIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
                <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                  Nenhum treino agendado encontrado para este período.
                </p>
                <p className="text-[10px] text-zinc-400 max-w-sm mx-auto">
                  Clique no botão "Agendar Treino" para cadastrar um novo horário para os seus alunos!
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredAgenda.map((item, idx) => {
                  const studentHasPhone = item.studentPhone && item.studentPhone.length > 5;
                  
                  return (
                    <div 
                      key={item.id || idx}
                      className="group flex flex-col md:flex-row md:items-center justify-between bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 p-4 rounded-2xl gap-4 hover:border-purple-500/30 hover:bg-zinc-100/80 dark:hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Time stamp display */}
                        <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex flex-col items-center justify-center min-w-16 border border-purple-500/10">
                          <Clock className="w-4 h-4 mb-0.5" />
                          <span className="font-display font-black text-xs">{formatEventTime(item.start)}</span>
                          <span className="text-[8px] opacity-75 font-bold mt-0.5">{calculateEndTime(item.start, 60)}</span>
                        </div>

                        {/* Event Details */}
                        <div className="space-y-1 min-w-0">
                          <p className="font-display font-black text-zinc-900 dark:text-zinc-50 text-sm tracking-tight flex flex-wrap items-center gap-1.5">
                            <span>{item.summary}</span>
                            
                            {/* Tags */}
                            {item.isGoogleEvent ? (
                              <span className="text-[8px] font-black px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/10 uppercase">
                                Google Agenda
                              </span>
                            ) : (
                              <span className="text-[8px] font-black px-1.5 py-0.2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md border border-purple-500/10 uppercase">
                                Local/Drive
                              </span>
                            )}
                          </p>
                          
                          <p className="text-zinc-400 dark:text-zinc-400 text-[10px] font-bold capitalize">
                            {formatEventDate(item.start)}
                          </p>

                          <p className="text-zinc-600 dark:text-zinc-300 text-xs italic line-clamp-1">
                            {item.description || item.studentFocus || 'Foco: Treino personalizado'}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-end md:self-auto border-t border-zinc-200/30 dark:border-white/5 pt-3 md:pt-0 md:border-none w-full md:w-auto justify-end">
                        
                        {/* Re-schedule shortcut */}
                        {item.studentId && (
                          <button
                            onClick={() => openSchedulerForStudent(item.studentId)}
                            className="p-2 text-zinc-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 bg-zinc-200/50 dark:bg-white/5 hover:bg-purple-500/10 rounded-xl transition duration-150 cursor-pointer"
                            title="Reagendar aula"
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </button>
                        )}

                        {/* WhatsApp Reminder link */}
                        {studentHasPhone && (
                          <a
                            href={getWhatsAppReminderLink(item.studentName, item.studentPhone, item.start, item.description || item.studentFocus)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-zinc-500 hover:text-emerald-500 dark:text-zinc-400 dark:hover:text-emerald-400 bg-zinc-200/50 dark:bg-white/5 hover:bg-emerald-500/10 rounded-xl transition duration-150"
                            title="Lembrete de Aula (WhatsApp)"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}

                        {/* Cancel session */}
                        <button
                          onClick={() => handleCancelWorkoutSession(item.studentId, item.isGoogleEvent ? item.id : undefined, item.studentName, item.start)}
                          className="p-2 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 bg-zinc-200/50 dark:bg-white/5 hover:bg-rose-500/10 rounded-xl transition duration-150 cursor-pointer"
                          title="Desmarcar / Cancelar treino"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Scheduler Modal Slider (Slide-over Dialog) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            
            {/* Dark Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />

            {/* Modal Body Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[32px] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 border-b border-zinc-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600/10 text-purple-600 rounded-2xl">
                    <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-zinc-900 dark:text-zinc-50">Novo Agendamento</h3>
                    <p className="text-zinc-400 text-xs font-semibold">Agendar treino de aluno ativo</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveAppointment} className="space-y-5 text-xs text-zinc-800 dark:text-zinc-200">
                
                {/* 1. Aluno Select */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Selecione o Aluno</label>
                  <select
                    value={formStudentId}
                    onChange={e => setFormStudentId(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100/70 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1.5 focus:ring-purple-500"
                    required
                  >
                    <option value="" disabled className="text-zinc-400 dark:bg-zinc-900">Selecione um aluno...</option>
                    {students.filter(s => s.ativo).map(s => (
                      <option key={s.id} value={s.id} className="dark:bg-zinc-900">
                        {s.nome} ({s.horario ? `Horário padrão: ${s.horario}` : 'Sem horário padrão'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Date and Time block */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">Data do Treino</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-100/70 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1.5 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300">Horário</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={e => setFormTime(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-100/70 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1.5 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                {/* 3. Duration Selector */}
                <div className="space-y-2">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-purple-500" />
                    Duração da Sessão
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {([30, 45, 60, 90] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setFormDuration(d)}
                        className={`py-2 rounded-xl text-center font-bold text-[10px] transition cursor-pointer ${formDuration === d ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300'}`}
                      >
                        {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}` : `${d} min`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Workout Focus selection & suggestions */}
                <div className="space-y-2">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Foco do Treino / Observação</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {focusSuggestions.map(sugg => {
                      const isSelected = formFocus === sugg;
                      return (
                        <button
                          key={sugg}
                          type="button"
                          onClick={() => {
                            setFormFocus(sugg);
                            setCustomFocus('');
                          }}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition border cursor-pointer ${isSelected ? 'bg-purple-500/10 border-purple-400 text-purple-700 dark:text-purple-400' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
                        >
                          {sugg}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setFormFocus('Outro')}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition border cursor-pointer ${formFocus === 'Outro' ? 'bg-purple-500/10 border-purple-400 text-purple-700 dark:text-purple-400' : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'}`}
                    >
                      Outro...
                    </button>
                  </div>

                  {formFocus === 'Outro' && (
                    <input
                      type="text"
                      value={customFocus}
                      onChange={e => setCustomFocus(e.target.value)}
                      placeholder="Descreva o foco do treino (ex: Cardio + HIIT)..."
                      className="w-full px-4 py-3 bg-zinc-100/70 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1.5 focus:ring-purple-500 animate-fadeIn"
                      required
                    />
                  )}
                </div>

                {/* Conflict Danger Banner in real-time */}
                <AnimatePresence>
                  {bookingConflict && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3.5 bg-amber-500/10 border border-amber-200/30 dark:border-amber-900/30 rounded-2xl flex items-start gap-2 text-amber-900 dark:text-amber-300"
                    >
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-black text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          Conflito de Horário!
                        </p>
                        <p className="text-[10px] mt-0.5 leading-relaxed font-semibold">
                          Atenção Apex: <strong className="underline">{bookingConflict.name}</strong> já está agendado(a) nesse mesmo intervalo.
                        </p>
                        <p className="text-[9px] opacity-75 mt-0.5">
                          {bookingConflict.detail}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-2xl font-bold transition text-zinc-700 dark:text-zinc-300 text-xs cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition text-xs shadow-lg shadow-purple-500/15 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Agendando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirmar Treino
                      </>
                    )}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
