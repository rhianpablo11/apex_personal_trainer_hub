import React, { useState } from 'react';
import { Student } from '../types';
import { Search, Filter, MessageSquare, ArrowUpDown, Circle, CheckCircle, HelpCircle, Eye, EyeOff } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (studentId: string) => void;
  onNavigate: (tab: string) => void;
}

type SortField = 'nome' | 'data_contratacao' | 'vencimento_dia';
type SortOrder = 'asc' | 'desc';

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid_due' | 'unpaid_ok'>('all');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const today = new Date();
  const currentDay = today.getDate();

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    // 1. Search term match
    const matchesSearch = student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      student.whatsapp.includes(searchTerm);
      
    // 2. Status filter
    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? student.ativo :
      !student.ativo;

    // 3. Payment filter
    let matchesPayment = true;
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'paid') {
        matchesPayment = student.pago_este_mes;
      } else if (paymentFilter === 'unpaid_due') {
        // Unpaid and expired (vencimento_dia is in the past)
        matchesPayment = !student.pago_este_mes && student.vencimento_dia < currentDay;
      } else if (paymentFilter === 'unpaid_ok') {
        // Unpaid but NOT expired yet (vencimento_dia is today or future)
        matchesPayment = !student.pago_este_mes && student.vencimento_dia >= currentDay;
      }
    }

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let fieldA = a[sortField];
    let fieldB = b[sortField];

    if (typeof fieldA === 'string') {
      fieldA = fieldA.toLowerCase();
      fieldB = (fieldB as string).toLowerCase();
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getPaymentBadge = (student: Student) => {
    if (student.pago_este_mes) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
          <CheckCircle className="w-3.5 h-3.5" />
          Pago
        </span>
      );
    } else if (student.vencimento_dia < currentDay) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
          <Circle className="w-3.5 h-3.5 fill-rose-600 dark:fill-rose-400 text-rose-600 dark:text-rose-400" />
          Atrasado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
          <HelpCircle className="w-3.5 h-3.5" />
          Pendente (Vence {student.vencimento_dia})
        </span>
      );
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Student CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Lista de Alunos</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
            Gerencie, filtre e visualize os perfis dos seus alunos.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/50 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
          />
        </div>

        {/* Filter Badges and Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-xl p-1">
              <button
                onClick={() => setStatusFilter('active')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'active' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'inactive' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Inativos
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Todos
              </button>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-1 bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-xl p-1">
              <button
                onClick={() => setPaymentFilter('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${paymentFilter === 'all' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Todos Pagts
              </button>
              <button
                onClick={() => setPaymentFilter('paid')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${paymentFilter === 'paid' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Pagos
              </button>
              <button
                onClick={() => setPaymentFilter('unpaid_due')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${paymentFilter === 'unpaid_due' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Atrasados
              </button>
              <button
                onClick={() => setPaymentFilter('unpaid_ok')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${paymentFilter === 'unpaid_ok' ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Em Dia
              </button>
            </div>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Ordenar por:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleSort('nome')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition cursor-pointer ${sortField === 'nome' ? 'bg-purple-500/10 border-purple-200 dark:border-white/10 text-purple-700 dark:text-white font-bold' : 'bg-transparent border-zinc-200 dark:border-white/5 text-zinc-500'}`}
              >
                Nome
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleSort('vencimento_dia')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition cursor-pointer ${sortField === 'vencimento_dia' ? 'bg-purple-500/10 border-purple-200 dark:border-white/10 text-purple-700 dark:text-white font-bold' : 'bg-transparent border-zinc-200 dark:border-white/5 text-zinc-500'}`}
              >
                Dia Venc.
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleSort('data_contratacao')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition cursor-pointer ${sortField === 'data_contratacao' ? 'bg-purple-500/10 border-purple-200 dark:border-white/10 text-purple-700 dark:text-white font-bold' : 'bg-transparent border-zinc-200 dark:border-white/5 text-zinc-500'}`}
              >
                Matrícula
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Student Cards */}
      {sortedStudents.length === 0 ? (
        <div className="text-center py-16 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Nenhum aluno encontrado correspondente aos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedStudents.map(student => (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student.id)}
              className="group bg-white/70 dark:bg-white/5 backdrop-blur-md hover:border-purple-500 dark:hover:border-purple-500/50 border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm hover:shadow-lg dark:hover:shadow-purple-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Name and Status Indicator */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition truncate tracking-tight text-base">
                      {student.nome}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{student.email || 'Sem e-mail'}</p>
                  </div>
                  {/* Active/Inactive badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${student.ativo ? 'bg-purple-500/10 border-purple-200/30 text-purple-700 dark:text-purple-300' : 'bg-zinc-100 dark:bg-white/5 border-transparent text-zinc-500 dark:text-slate-400'}`}>
                    {student.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Training and Schedule info */}
                <div className="mt-4 grid grid-cols-2 gap-3 border-y border-zinc-100 dark:border-white/5 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Horário do Treino</span>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{student.horario || 'Não agendado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Valor Mensal</span>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {(student.valor_mensalidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                {/* Workout Type */}
                <div className="mt-3 text-xs">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Foco/Observações de Treino</span>
                  <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 line-clamp-1 font-medium">{student.treino || 'Nenhuma observação de treino'}</p>
                </div>
              </div>

              {/* Bottom Row: Payment status badge and WhatsApp Quick Chat */}
              <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-4 text-xs">
                {getPaymentBadge(student)}

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`https://api.whatsapp.com/send?phone=55${student.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Enviar Mensagem"
                    className="p-1.5 bg-zinc-50 hover:bg-purple-500/10 dark:bg-white/5 dark:hover:bg-purple-500/10 dark:hover:text-purple-400 border border-zinc-200/50 dark:border-white/5 text-zinc-500 rounded-lg transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
