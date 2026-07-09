import React, { useState } from 'react';
import { Student, Payment } from '../types';
import { jsPDF } from 'jspdf';
import { 
  ArrowLeft, Edit, Trash2, Calendar, Phone, Mail, 
  Clock, DollarSign, UserCheck, UserX, FileText, CheckCircle, 
  XCircle, Plus, Send, RefreshCw, Eye
} from 'lucide-react';

interface StudentDetailProps {
  student: Student;
  payments: Payment[];
  onBack: () => void;
  onEdit: () => void;
  onToggleStatus: () => void; // Deactivation / Activation (Delete)
  onRecordPayment: (paymentData: Omit<Payment, 'id'>) => void;
  onEditPayment: (paymentId: string, paymentData: Partial<Payment>) => void;
  onDeletePayment: (paymentId: string) => void;
  onSyncCalendar: (student: Student) => void;
}

export const StudentDetail: React.FC<StudentDetailProps> = ({
  student,
  payments,
  onBack,
  onEdit,
  onToggleStatus,
  onRecordPayment,
  onEditPayment,
  onDeletePayment,
  onSyncCalendar,
}) => {
  const [showPayModal, setShowPayModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7)); // "2026-07"
  const [payAmount, setPayAmount] = useState(student.valor_mensalidade?.toString() || '200');
  const [payMethod, setPayMethod] = useState(student.forma_pagamento || 'Pix');
  const [isSyncingEvent, setIsSyncingEvent] = useState(false);

  // Filter payments just for this student
  const studentPayments = payments
    .filter(p => p.student_id === student.id)
    .sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia));

  const formatPhone = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPayment) {
      onEditPayment(editingPayment.id, {
        mes_referencia: payMonth,
        valor: parseFloat(payAmount) || 0,
        forma_pagamento: payMethod
      });
    } else {
      onRecordPayment({
        student_id: student.id,
        nome_aluno: student.nome,
        mes_referencia: payMonth,
        data_pagamento: new Date().toISOString().slice(0, 10),
        valor: parseFloat(payAmount) || 0,
        forma_pagamento: payMethod,
        status: 'Pago'
      });
    }
    setShowPayModal(false);
    setEditingPayment(null);
  };

  const handleStartEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPayMonth(payment.mes_referencia);
    setPayAmount(payment.valor.toString());
    setPayMethod(payment.forma_pagamento);
    setShowPayModal(true);
  };

  const handleStartCreatePayment = () => {
    setEditingPayment(null);
    setPayMonth(new Date().toISOString().slice(0, 7));
    setPayAmount(student.valor_mensalidade?.toString() || '200');
    setPayMethod(student.forma_pagamento || 'Pix');
    setShowPayModal(true);
  };

  const handleDeletePaymentClick = (paymentId: string) => {
    if (confirm('Tem certeza de que deseja excluir este registro de pagamento?')) {
      onDeletePayment(paymentId);
    }
  };

  // Google Calendar Integration
  const handleCalendarSync = async () => {
    if (!student.data_hora_treino) {
      alert('Por favor, defina um horário para o próximo treino nas configurações do aluno primeiro.');
      return;
    }
    setIsSyncingEvent(true);
    try {
      await onSyncCalendar(student);
      alert('Treino agendado com sucesso na sua Google Agenda!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao sincronizar com Google Agenda: ' + err.message);
    } finally {
      setIsSyncingEvent(false);
    }
  };

  // Generate beautiful PDF Recibo / Ficha Cadastral using jsPDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const primaryColor = '#7c3aed'; // Purple Accent
    
    // Header banner
    doc.setFillColor(39, 39, 42); // zinc-800
    doc.rect(0, 0, 210, 40, 'F');
    
    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Apex - Training Hub", 105, 18, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Relatório Cadastral de Aluno & Histórico de Mensalidades", 105, 26, { align: 'center' });
    
    // Student Details Box
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DADOS DO ALUNO", 15, 55);
    
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 58, 195, 58);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Nome:", 15, 68);
    doc.setFont("helvetica", "normal");
    doc.text(student.nome, 30, 68);
    
    doc.setFont("helvetica", "bold");
    doc.text("WhatsApp:", 15, 76);
    doc.setFont("helvetica", "normal");
    doc.text(student.whatsapp, 38, 76);
    
    doc.setFont("helvetica", "bold");
    doc.text("E-mail:", 15, 84);
    doc.setFont("helvetica", "normal");
    doc.text(student.email || "Não informado", 32, 84);
    
    doc.setFont("helvetica", "bold");
    doc.text("Matrícula:", 120, 68);
    doc.setFont("helvetica", "normal");
    doc.text(student.data_contratacao, 140, 68);
    
    doc.setFont("helvetica", "bold");
    doc.text("Mensalidade:", 120, 76);
    doc.setFont("helvetica", "normal");
    doc.text((student.valor_mensalidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 145, 76);
    
    doc.setFont("helvetica", "bold");
    doc.text("Vencimento:", 120, 84);
    doc.setFont("helvetica", "normal");
    doc.text(`Dia ${student.vencimento_dia}`, 143, 84);

    // Workout details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PLANEJAMENTO DE TREINO & HORÁRIOS", 15, 100);
    doc.line(15, 102, 195, 102);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Horário padrão:", 15, 110);
    doc.setFont("helvetica", "normal");
    doc.text(student.horario || "Não informado", 45, 110);

    doc.setFont("helvetica", "bold");
    doc.text("Observações/Foco:", 15, 118);
    doc.setFont("helvetica", "normal");
    const splitTreino = doc.splitTextToSize(student.treino || "Nenhuma observação cadastrada", 180);
    doc.text(splitTreino, 15, 124);

    // Payment History List
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("HISTÓRICO DE PAGAMENTOS", 15, 155);
    doc.line(15, 157, 195, 157);

    // Table Headers
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 163, 180, 8, 'F');
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Mês de Ref.", 20, 168);
    doc.text("Data Pagto", 65, 168);
    doc.text("Valor Pago", 110, 168);
    doc.text("Forma Pagto", 155, 168);

    doc.setFont("helvetica", "normal");
    let currentY = 177;
    
    if (studentPayments.length === 0) {
      doc.text("Nenhum pagamento registrado ainda para este aluno.", 15, currentY);
    } else {
      studentPayments.slice(0, 8).forEach(p => {
        doc.text(p.mes_referencia, 20, currentY);
        doc.text(p.data_pagamento, 65, currentY);
        doc.text(p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 110, currentY);
        doc.text(p.forma_pagamento, 155, currentY);
        
        doc.setDrawColor(240, 240, 240);
        doc.line(15, currentY + 3, 195, currentY + 3);
        currentY += 10;
      });
    }

    // Sign Line
    doc.setDrawColor(180, 180, 180);
    doc.line(55, 265, 155, 265);
    doc.setFontSize(9);
    doc.text("Apex Personal Trainer - Assinatura do Profissional", 105, 270, { align: 'center' });

    doc.save(`relatorio_${student.nome.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{student.nome}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${student.ativo ? 'bg-purple-500/10 border-purple-200/30 text-purple-700 dark:text-purple-300' : 'bg-zinc-100 dark:bg-white/5 border-transparent text-zinc-500 dark:text-slate-400'}`}>
                {student.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">Ficha completa e histórico financeiro.</p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            Editar
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Gerar PDF
          </button>

          <button
            onClick={() => {
              const action = student.ativo ? 'desativar' : 'ativar';
              const confirm = window.confirm(`Deseja realmente ${action} o aluno ${student.nome}?`);
              if (confirm) onToggleStatus();
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer border ${student.ativo ? 'bg-rose-500/10 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}
          >
            {student.ativo ? (
              <>
                <UserX className="w-3.5 h-3.5" />
                Desativar Aluno
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                Ativar Aluno
              </>
            )}
          </button>
        </div>
      </div>

      {/* Profile Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Info Cards */}
        <div className="space-y-6 lg:col-span-1">
          {/* Contact & Personal Card */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-semibold text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wider text-purple-600 dark:text-purple-400 border-b border-zinc-100 dark:border-white/5 pb-2">
              Contato e Pessoal
            </h4>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100/50 dark:bg-white/5 text-zinc-500 dark:text-slate-400 border border-zinc-200/50 dark:border-white/5 rounded-xl">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold">Celular / Whatsapp</p>
                  <a
                    href={`https://api.whatsapp.com/send?phone=55${formatPhone(student.whatsapp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-purple-600 dark:text-purple-400 hover:underline mt-0.5"
                  >
                    {student.whatsapp}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100/50 dark:bg-white/5 text-zinc-500 dark:text-slate-400 border border-zinc-200/50 dark:border-white/5 rounded-xl">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold">E-mail</p>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{student.email || 'Não cadastrado'}</p>
                </div>
              </div>

              {student.senha && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100/50 dark:bg-white/5 text-zinc-500 dark:text-slate-400 border border-zinc-200/50 dark:border-white/5 rounded-xl">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold">Senha de Aluno</p>
                    <p className="font-mono text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">{student.senha}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plano & Cobranca Card */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-semibold text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wider text-purple-600 dark:text-purple-400 border-b border-zinc-100 dark:border-white/5 pb-2">
              Plano de Assinatura
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold">Vencimento</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">Todo dia {student.vencimento_dia}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold">Mensalidade</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {(student.valor_mensalidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold">Pagamento</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{student.forma_pagamento}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold">Início</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{student.data_contratacao}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Workouts & Payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Planejamento de Treino e Integração com Agenda */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
              <h4 className="font-display font-semibold text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Horários e Treino
              </h4>
              {student.data_hora_treino && (
                <button
                  onClick={handleCalendarSync}
                  disabled={isSyncingEvent}
                  className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-bold px-2 py-1.5 rounded-lg uppercase cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingEvent ? 'animate-spin' : ''}`} />
                  Agendar na Google Agenda
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-1">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  Horário de Treino Padrão
                </p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">{student.horario || 'Não informado'}</p>
              </div>

              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Próxima Aula Agendada
                </p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                  {student.data_hora_treino ? new Date(student.data_hora_treino).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nenhuma aula pendente'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Rotina de Treinos / Observações</p>
              <div className="bg-zinc-50/50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200/50 dark:border-white/5 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                {student.treino || 'Nenhuma rotina ou detalhe de treino cadastrado para este aluno.'}
              </div>
            </div>
          </div>

          {/* Histórico Financeiro */}
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
              <h4 className="font-display font-semibold text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Histórico de Cobrança
              </h4>
              <button
                onClick={handleStartCreatePayment}
                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg uppercase transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Registrar Pagamento
              </button>
            </div>

            {studentPayments.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                Nenhum pagamento registrado ainda para este aluno.
              </div>
            ) : (
              <div className="border border-zinc-200/50 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-zinc-200/50 dark:divide-white/5">
                {studentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3.5 text-xs bg-zinc-100/30 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-850 dark:text-zinc-200">Ref: {p.mes_referencia}</p>
                        <p className="text-[10px] text-zinc-400">Pago em: {new Date(p.data_pagamento).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">
                          {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <span className="text-[10px] font-medium text-zinc-400">{p.forma_pagamento}</span>
                      </div>
                      <div className="flex items-center gap-1 border-l border-zinc-200/50 dark:border-white/5 pl-2">
                        <button
                          onClick={() => handleStartEditPayment(p)}
                          className="p-1 text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer"
                          title="Editar pagamento"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePaymentClick(p.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                          title="Excluir pagamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Recording Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-md p-4">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-3xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowPayModal(false)}
              className="absolute right-4 top-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              {editingPayment ? 'Editar Lançamento' : 'Registrar Pagamento'}
            </h3>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Mês de Referência</label>
                <input
                  type="month"
                  required
                  value={payMonth}
                  onChange={(e) => setPayMonth(e.target.value)}
                  className="w-full bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Valor Pago</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Forma de Pagamento</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão de Crédito/Débito</option>
                  <option value="Transferência">Transferência Bancária</option>
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200/50 dark:border-white/5 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {editingPayment ? 'Salvar Alterações' : 'Confirmar Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
