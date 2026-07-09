import React from 'react';
import { Student, Payment } from '../types';
import { Users, DollarSign, AlertCircle, Calendar, MessageSquare, Plus, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface DashboardProps {
  students: Student[];
  payments: Payment[];
  onNavigate: (tab: string) => void;
  onQuickPay: (studentId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  payments,
  onNavigate,
  onQuickPay,
}) => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthYear = today.toISOString().slice(0, 7); // "2026-07"
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentMonthName = monthNames[today.getMonth()];

  const activeStudents = students.filter(s => s.ativo);
  const inactiveStudents = students.filter(s => !s.ativo);

  // Financial Calculations
  // Total received this month: sum of payments of this month with status "Pago"
  const receivedThisMonth = payments
    .filter(p => p.mes_referencia === currentMonthYear && p.status === 'Pago')
    .reduce((sum, p) => sum + p.valor, 0);

  // Active students who have paid this month
  const paidActiveIds = new Set(
    payments
      .filter(p => p.mes_referencia === currentMonthYear && p.status === 'Pago')
      .map(p => p.student_id)
  );

  // Active students who haven't paid this month
  const unpaidActiveStudents = activeStudents.filter(s => !paidActiveIds.has(s.id));

  // Pending payments amount this month: sum of monthly fees of active students who haven't paid yet
  const pendingThisMonth = unpaidActiveStudents.reduce((sum, s) => sum + (s.valor_mensalidade || 0), 0);

  // Alerts calculations
  const expiredStudents = unpaidActiveStudents.filter(s => s.vencimento_dia < currentDay);
  const upcomingStudents = unpaidActiveStudents.filter(s => s.vencimento_dia >= currentDay && s.vencimento_dia <= currentDay + 4);

  // Payment Methods Breakdown (for Pie Chart)
  const paymentsThisMonth = payments.filter(p => p.mes_referencia === currentMonthYear && p.status === 'Pago');
  const methodMap: Record<string, number> = { Pix: 0, Dinheiro: 0, Cartão: 0, Transferência: 0 };
  paymentsThisMonth.forEach(p => {
    const method = p.forma_pagamento || 'Pix';
    methodMap[method] = (methodMap[method] || 0) + p.valor;
  });

  const pieData = Object.entries(methodMap)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({ name: key, value }));

  const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b'];

  // Historical collection data (last 6 months)
  const getHistoricalData = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mY = d.toISOString().slice(0, 7);
      const mName = d.toLocaleDateString('pt-BR', { month: 'short' });
      
      const received = payments
        .filter(p => p.mes_referencia === mY && p.status === 'Pago')
        .reduce((sum, p) => sum + p.valor, 0);
        
      data.push({
        name: mName.charAt(0).toUpperCase() + mName.slice(1),
        Recebido: received,
      });
    }
    return data;
  };

  const barData = getHistoricalData();

  // Create WhatsApp message link
  const getWhatsAppLink = (student: Student, type: 'expired' | 'upcoming') => {
    const phone = student.whatsapp.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    
    let message = '';
    if (type === 'expired') {
      message = `Olá *${student.nome}*! Tudo bem? Passando para lembrar que a mensalidade do seu treino personalizado venceu no dia *${student.vencimento_dia}* deste mês. Se você já realizou o pagamento, por favor envie o comprovante ou desconsidere esta mensagem. Muito obrigado! 💪 - Apex Personal`;
    } else {
      message = `Olá *${student.nome}*! Tudo bem? Passando para lembrar que a mensalidade do seu treino personalizado vencerá no próximo dia *${student.vencimento_dia}*. Qualquer dúvida estou à disposição! Grande abraço! 💪 - Apex Personal`;
    }
    
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  // Scheduled training sessions today (using local timezone comparison)
  const todayLocalString = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const todayWorkouts = activeStudents.filter(s => {
    if (!s.data_hora_treino) return false;
    const itemDate = new Date(s.data_hora_treino);
    const itemLocalString = new Date(itemDate.getTime() - itemDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return itemLocalString === todayLocalString;
  }).sort((a, b) => {
    const dateA = new Date(a.data_hora_treino!);
    const dateB = new Date(b.data_hora_treino!);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Painel Geral</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
            Acompanhe seus alunos, cobranças e treinos de {currentMonthName}.
          </p>
        </div>
        <button
          onClick={() => onNavigate('add-student')}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          Novo Aluno
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total students */}
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-zinc-200/50 dark:border-white/10 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-lg dark:hover:shadow-purple-500/5">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">Total de Alunos</p>
            <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-zinc-50">{students.length}</h3>
            <div className="flex gap-2 text-xs">
              <span className="text-emerald-600 font-medium">{activeStudents.length} ativos</span>
              <span className="text-zinc-400 font-medium">•</span>
              <span className="text-zinc-500">{inactiveStudents.length} desativados</span>
            </div>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Received this month */}
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-zinc-200/50 dark:border-white/10 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-lg dark:hover:shadow-emerald-500/5">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">Recebido no Mês</p>
            <h3 className="text-3xl font-display font-bold text-emerald-600 dark:text-emerald-400">
              {receivedThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Registrado de pagamentos pagos
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Pending this month */}
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-zinc-200/50 dark:border-white/10 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-lg dark:hover:shadow-amber-500/5">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">Pendente no Mês</p>
            <h3 className="text-3xl font-display font-bold text-amber-600 dark:text-amber-400">
              {pendingThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              De alunos ativos sem pagar
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Missing Payment count */}
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-zinc-200/50 dark:border-white/10 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-lg dark:hover:shadow-rose-500/5">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">Falta Pagar</p>
            <h3 className="text-3xl font-display font-bold text-rose-600 dark:text-rose-400">{unpaidActiveStudents.length}</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Alunos ativos pendentes
            </p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-500/20">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Workout Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Alerts and workout schedule */}
        <div className="lg:col-span-1 space-y-6">
          {/* Alerts Card */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
              Cobranças de {currentMonthName}
            </h4>
            
            {expiredStudents.length === 0 && upcomingStudents.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Tudo em dia! Nenhuma mensalidade vencida ou próxima do vencimento.</p>
              </div>
            )}

            {/* Expired Payments */}
            {expiredStudents.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-md uppercase tracking-wider">Vencidos</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {expiredStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between bg-zinc-100/50 dark:bg-white/5 p-2.5 rounded-2xl border border-zinc-200/50 dark:border-white/5 text-xs">
                      <div className="flex-1">
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">{student.nome}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Venceu dia {student.vencimento_dia} • {(student.valor_mensalidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onQuickPay(student.id)}
                          title="Confirmar Pagamento"
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/10 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getWhatsAppLink(student, 'expired')}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Cobrar no WhatsApp"
                          className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/10 transition flex items-center justify-center cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Payments */}
            {upcomingStudents.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-md uppercase tracking-wider">Próximos Vencimentos</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {upcomingStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between bg-zinc-100/50 dark:bg-white/5 p-2.5 rounded-2xl border border-zinc-200/50 dark:border-white/5 text-xs">
                      <div className="flex-1">
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">{student.nome}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Vence dia {student.vencimento_dia} • {(student.valor_mensalidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onQuickPay(student.id)}
                          title="Confirmar Pagamento"
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/10 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getWhatsAppLink(student, 'upcoming')}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Notificar no WhatsApp"
                          className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/10 transition flex items-center justify-center cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Training sessions today */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-purple-500" />
              Treinos de Hoje
            </h4>
            
            {todayWorkouts.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                Nenhum treino agendado para hoje.
              </div>
            ) : (
              <div className="space-y-2">
                {todayWorkouts.map(student => (
                  <div key={student.id} className="flex items-center gap-3 bg-zinc-100/50 dark:bg-white/5 p-3 rounded-2xl border border-zinc-200/50 dark:border-white/5">
                    <span className="font-display font-bold text-purple-600 dark:text-purple-400 text-sm whitespace-nowrap">
                      {student.data_hora_treino ? new Date(student.data_hora_treino).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">{student.nome}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{student.treino || 'Nenhuma observação de treino'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onNavigate('agenda')}
              className="w-full py-2.5 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-slate-200 rounded-xl text-xs font-semibold text-center transition cursor-pointer border border-transparent dark:border-white/5"
            >
              Ver Agenda Completa
            </button>
          </div>
        </div>

        {/* Right columns: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Historical Collection Chart */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-semibold text-zinc-900 dark:text-zinc-50">Histórico de Receita (Últimos 6 Meses)</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} stroke="#71717a" />
                  <YAxis fontSize={11} stroke="#71717a" tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip
                    formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Recebido']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(12px)' }}
                    labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                    itemStyle={{ color: '#a855f7' }}
                  />
                  <Bar dataKey="Recebido" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Formas de Pagamento (Pie) */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-semibold text-zinc-900 dark:text-zinc-50">Arrecadação por Forma de Pagamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {pieData.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                  Nenhum pagamento registrado como pago neste mês para exibir estatísticas.
                </div>
              ) : (
                <>
                  <div className="h-48 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {pieData.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{entry.name}</span>
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
