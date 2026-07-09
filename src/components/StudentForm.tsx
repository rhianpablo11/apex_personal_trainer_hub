import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { X, ArrowLeft, Save, Sparkles } from 'lucide-react';

interface StudentFormProps {
  student?: Student; // If provided, we are editing
  onSave: (studentData: Omit<Student, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  student,
  onSave,
  onCancel,
}) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [horario, setHorario] = useState('08:00');
  const [vencimentoDia, setVencimentoDia] = useState<number>(10);
  const [dataContratacao, setDataContratacao] = useState(new Date().toISOString().slice(0, 10));
  const [pagoEsteMes, setPagoEsteMes] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [treino, setTreino] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [valorMensalidade, setValorMensalidade] = useState<string>('200');
  const [dataHoraTreino, setDataHoraTreino] = useState('');

  // Auto-format phone input while typing
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    let formatted = rawVal;
    if (rawVal.length > 2) {
      formatted = `(${rawVal.slice(0, 2)}) ${rawVal.slice(2)}`;
    }
    if (rawVal.length > 7) {
      formatted = `(${rawVal.slice(0, 2)}) ${rawVal.slice(2, 7)}-${rawVal.slice(7, 11)}`;
    }
    setWhatsapp(formatted);
  };

  // Populate form if editing an existing student
  useEffect(() => {
    if (student) {
      setNome(student.nome);
      setEmail(student.email || '');
      setSenha(student.senha || '');
      setHorario(student.horario || '08:00');
      setVencimentoDia(student.vencimento_dia || 10);
      setDataContratacao(student.data_contratacao || new Date().toISOString().slice(0, 10));
      setPagoEsteMes(student.pago_este_mes || false);
      setWhatsapp(student.whatsapp || '');
      setFormaPagamento(student.forma_pagamento || 'Pix');
      setTreino(student.treino || '');
      setAtivo(student.ativo !== false);
      setValorMensalidade(student.valor_mensalidade?.toString() || '0');
      
      if (student.data_hora_treino) {
        // Convert ISO date or text format into local "YYYY-MM-DDTHH:MM" for datetime-local input to avoid timezone shift
        try {
          const d = new Date(student.data_hora_treino);
          const tzOffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
          const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
          setDataHoraTreino(localISOTime);
        } catch {
          setDataHoraTreino('');
        }
      } else {
        setDataHoraTreino('');
      }
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    // Remove non-numeric characters for clean phone persistence if needed
    onSave({
      id: student?.id, // include if editing
      nome,
      email,
      senha,
      horario,
      vencimento_dia: vencimentoDia,
      data_contratacao: dataContratacao,
      pago_este_mes: pagoEsteMes,
      whatsapp,
      forma_pagamento: formaPagamento,
      treino,
      ativo,
      valor_mensalidade: parseFloat(valorMensalidade) || 0,
      data_hora_treino: dataHoraTreino ? new Date(dataHoraTreino).toISOString() : undefined
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header and Back navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {student ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
            {student ? 'Atualize as informações do perfil do aluno.' : 'Insira os dados cadastrais do novo aluno.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/70 dark:bg-white/5 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Section 1: Dados Pessoais */}
          <div>
            <span className="text-[10px] font-display font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-3 border-b border-zinc-100 dark:border-white/5 pb-1.5">
              Dados Pessoais
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  WhatsApp (Celular) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: (11) 99999-8888"
                  value={whatsapp}
                  onChange={handlePhoneChange}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  E-mail <span className="text-zinc-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="Ex: joao@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Senha para Futuro Acesso <span className="text-zinc-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Criar senha provisória"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Plano e Financeiro */}
          <div>
            <span className="text-[10px] font-display font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-3 border-b border-zinc-100 dark:border-white/5 pb-1.5">
              Contratação e Pagamentos
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Data de Matrícula
                </label>
                <input
                  type="date"
                  required
                  value={dataContratacao}
                  onChange={(e) => setDataContratacao(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Dia de Vencimento
                </label>
                <select
                  value={vencimentoDia}
                  onChange={(e) => setVencimentoDia(parseInt(e.target.value))}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                >
                  <option value={5}>Dia 5</option>
                  <option value={10}>Dia 10</option>
                  <option value={15}>Dia 15</option>
                  <option value={20}>Dia 20</option>
                  <option value={25}>Dia 25</option>
                  <option value={30}>Dia 30</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Valor da Mensalidade
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="200"
                    value={valorMensalidade}
                    onChange={(e) => setValorMensalidade(e.target.value)}
                    className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Forma de Pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão de Crédito/Débito</option>
                  <option value="Transferência">Transferência Bancária</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Agenda e Treino */}
          <div>
            <span className="text-[10px] font-display font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-3 border-b border-zinc-100 dark:border-white/5 pb-1.5">
              Horários e Planejamento de Treino
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Horário Padrão de Treino <span className="text-zinc-400 font-normal">(Ex: Seg/Qua/Sex)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 08:00 (Seg/Qua/Sex)"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Próxima Aula Agendada <span className="text-zinc-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={dataHoraTreino}
                  onChange={(e) => setDataHoraTreino(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5 mt-4">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Foco do Treino / Observações Médicas
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Treino de Hipertrofia. Restrição no joelho esquerdo. Fortalecimento de quadríceps..."
                value={treino}
                onChange={(e) => setTreino(e.target.value)}
                className="w-full bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 resize-none animate-all"
              />
            </div>
          </div>

          {/* Section 4: Configurações do Sistema */}
          <div className="pt-2">
            <span className="text-[10px] font-display font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-3 border-b border-zinc-100 dark:border-white/5 pb-1.5">
              Status do Aluno
            </span>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-3 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4.5 h-4.5 text-purple-600 border-zinc-200/55 dark:border-white/10 bg-zinc-100 dark:bg-white/5 rounded focus:ring-purple-500"
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Aluno Ativo</p>
                  <p className="text-[10px] text-zinc-400">Marque para mantê-lo na lista de cobranças e treinos</p>
                </div>
              </label>

              {!student && (
                <label className="flex items-center gap-3 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pagoEsteMes}
                    onChange={(e) => setPagoEsteMes(e.target.checked)}
                    className="w-4.5 h-4.5 text-purple-600 border-zinc-200/55 dark:border-white/10 bg-zinc-100 dark:bg-white/5 rounded focus:ring-purple-500"
                  />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Já pago este mês?</p>
                    <p className="text-[10px] text-zinc-400">Registrará automaticamente um pagamento para o mês corrente</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-zinc-100/50 dark:bg-white/5 border-t border-zinc-200/50 dark:border-white/5 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-transparent hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Salvar Aluno
          </button>
        </div>
      </form>
    </div>
  );
};
