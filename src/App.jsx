import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Clock,
  Lock,
  X,
  EyeOff,
  Flame,
  Send,
  RotateCcw,
  Check,
  FileText,
  Layers,
  TrendingUp,
  Bell,
  PauseCircle,
  PlayCircle,
  XCircle,
  Info,
} from 'lucide-react';
import evaluateReason from './utils/evalGate';
import Disclaimer from './components/Disclaimer';
import { supabase } from './lib/supabase';

const TEST_SCENARIOS = [
  {
    label: 'Cashflow crunch',
    text: 'Salary delayed this month and Diwali bills piled up, worried about bank bounce charges',
    state: 'cashflow',
  },
  {
    label: 'Market advice',
    text: 'Should I switch to a better fund? Which fund will give higher returns next year?',
    state: 'advisory',
  },
  {
    label: 'Debit tomorrow',
    text: 'I need to cancel now, my SIP debit is tomorrow, please stop it urgently',
    state: 'cutoff',
  },
];

function formatINR(amount) {
  return '\u20B9' + amount.toLocaleString('en-IN');
}

export default function App() {
  const [mode, setMode] = useState('as-is');
  const [sips, setSips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSipId, setSelectedSipId] = useState('ppfas');
  const [screen, setScreen] = useState('dashboard');

  // As-Is UI states
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showEditSubMenu, setShowEditSubMenu] = useState(false);
  const [asIsActionLog, setAsIsActionLog] = useState(null);
  const [clickCount, setClickCount] = useState(0);

  // To-Be MVP states
  const [showQuickSkipSheet, setShowQuickSkipSheet] = useState(false);
  const [showAiInterceptModal, setShowAiInterceptModal] = useState(false);
  const [userReasonInput, setUserReasonInput] = useState(
    'Salary delayed this month and Diwali bills piled up, worried about bank bounce charges'
  );
  const [evalScenario, setEvalScenario] = useState('cashflow');
  const [mvpToast, setMvpToast] = useState(null);
  const [showAnnotations, setShowAnnotations] = useState(true);

  const activeSip = sips.find(s => s.id === selectedSipId) || sips[0];

  // Load SIPs from Supabase
  useEffect(() => {
    loadSips();
  }, []);

  const loadSips = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('sips').select('*').order('name');
    if (error) {
      console.error('Failed to load SIPs:', error);
      setLoading(false);
      return;
    }
    if (data && data.length > 0) {
      setSips(data.map(mapSip));
    }
    setLoading(false);
  };

  const mapSip = (row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    nextDebit: row.next_debit,
    daysLeft: row.days_left,
    streakMonths: row.streak_months,
    totalInvested: row.total_invested,
    currentValue: row.current_value,
    returns: row.returns,
    status: row.status,
    skippedMonth: row.skipped_month,
    logoBg: row.logo_bg,
    logoText: row.logo_text,
  });

  const persistSip = useCallback(async (id, updates) => {
    const dbUpdates = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.nextDebit !== undefined) dbUpdates.next_debit = updates.nextDebit;
    if (updates.skippedMonth !== undefined) dbUpdates.skipped_month = updates.skippedMonth;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('sips').update(dbUpdates).eq('id', id);
    if (error) console.error('Failed to persist SIP update:', error);
  }, []);

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setScreen('dashboard');
    setShowThreeDotMenu(false);
    setShowEditSubMenu(false);
    setAsIsActionLog(null);
    setShowQuickSkipSheet(false);
    setShowAiInterceptModal(false);
    setMvpToast(null);
    setClickCount(0);
  };

  const handleResetDemo = async () => {
    handleSwitchMode(mode);
    // Reset DB state
    await supabase.from('sips').update({
      status: 'Active',
      next_debit: null,
      skipped_month: null,
    }).in('id', ['ppfas', 'nippon']);
    // Restore correct next_debit values
    await supabase.from('sips').update({ next_debit: '10 Nov 2026' }).eq('id', 'ppfas');
    await supabase.from('sips').update({ next_debit: '14 Nov 2026' }).eq('id', 'nippon');
    loadSips();
  };

  const runEvalGate = (text) => {
    const result = evaluateReason(text);
    setEvalScenario(result.state);
  };

  const applyOneTapSkip = async (sourceLabel) => {
    const updates = {
      status: 'Snoozed (Nov Skipped)',
      nextDebit: '10 Dec 2026 (Auto-Resumes)',
      skippedMonth: 'Nov 2026',
    };
    setSips(prev =>
      prev.map(item =>
        item.id === activeSip.id ? { ...item, ...updates } : item
      )
    );
    setShowQuickSkipSheet(false);
    setShowAiInterceptModal(false);
    setMvpToast(
      `Nov 2026 installment skipped via ${sourceLabel}! Your ${activeSip.streakMonths}-month streak & e-NACH mandate are safe.`
    );
    await persistSip(activeSip.id, updates);
    setTimeout(() => setMvpToast(null), 5000);
  };

  const applyPermanentCancel = async () => {
    const updates = {
      status: 'Cancelled Permanently',
      nextDebit: 'Mandate Terminated',
    };
    setSips(prev =>
      prev.map(item =>
        item.id === activeSip.id ? { ...item, ...updates } : item
      )
    );
    setShowAiInterceptModal(false);
    setAsIsActionLog('cancelled');
    setClickCount(c => c + 1);
    await persistSip(activeSip.id, updates);
  };

  // As-Is: simulate the multi-step cancel flow
  const asIsCancelStep = (step) => {
    setClickCount(c => c + 1);
    if (step === 'open-menu') {
      setShowThreeDotMenu(true);
    } else if (step === 'edit') {
      setShowThreeDotMenu(false);
      setShowEditSubMenu(true);
    } else if (step === 'cancel-confirm') {
      setShowEditSubMenu(false);
      setAsIsActionLog('confirm-prompt');
    } else if (step === 'cancel-final') {
      applyPermanentCancel();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse text-sm">Loading SIP data...</div>
      </div>
    );
  }

  if (!activeSip) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-sm">No SIP data found.</div>
      </div>
    );
  }

  const isSnoozed = activeSip.status.includes('Snoozed');
  const isCancelled = activeSip.status.includes('Cancelled');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* ───── Page Header ───── */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Groww SIP Snooze Saver
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Compare the current cancellation flow vs. AI-powered retention intercept.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnnotations(a => !a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                showAnnotations
                  ? 'bg-[#00D09C] text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {showAnnotations ? <EyeOff className="w-3.5 h-3.5 inline mr-1" /> : <Layers className="w-3.5 h-3.5 inline mr-1" />}
              {showAnnotations ? 'Hide' : 'Show'} Annotations
            </button>
            <button
              onClick={handleResetDemo}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo
            </button>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="mt-5 inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => handleSwitchMode('as-is')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition ${
              mode === 'as-is'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            As-Is (Current Groww)
          </button>
          <button
            onClick={() => handleSwitchMode('to-be')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition ${
              mode === 'to-be'
                ? 'bg-[#00D09C] text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            To-Be (SIP Snooze Saver)
          </button>
        </div>
      </div>

      {/* ───── Main layout ───── */}
      <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left column: context / annotations */}
        <div className="lg:w-64 shrink-0 order-2 lg:order-1 space-y-4">
          {mode === 'as-is' ? (
            <div className="bg-rose-950/40 border border-rose-900/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-rose-200">As-Is: Current Flow</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Users who face a temporary cash crunch must permanently cancel their SIP.
                There is no way to pause or skip a single month.
              </p>
              {showAnnotations && (
                <ul className="text-[11px] text-slate-500 space-y-2 pt-2 border-t border-rose-900/40">
                  <li className="flex gap-1.5"><span className="text-rose-500 font-bold">1.</span> Tap three-dot menu</li>
                  <li className="flex gap-1.5"><span className="text-rose-500 font-bold">2.</span> Select "Edit SIP"</li>
                  <li className="flex gap-1.5"><span className="text-rose-500 font-bold">3.</span> Tap "Cancel SIP"</li>
                  <li className="flex gap-1.5"><span className="text-rose-500 font-bold">4.</span> Confirm cancellation</li>
                  <li className="flex gap-1.5"><span className="text-rose-500 font-bold">5.</span> Mandate terminated — streak lost</li>
                </ul>
              )}
              {clickCount > 0 && (
                <div className="pt-2 border-t border-rose-900/40">
                  <div className="text-[10px] text-rose-400 font-semibold">
                    Taps so far: {clickCount} {clickCount >= 4 && '(Complete)'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00D09C]" />
                <h3 className="text-sm font-bold text-emerald-200">To-Be: AI Intercept</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI detects the user's reason and offers a 1-month free skip instead of permanent
                cancellation, protecting the streak and the e-NACH mandate.
              </p>
              {showAnnotations && (
                <ul className="text-[11px] text-slate-500 space-y-2 pt-2 border-t border-emerald-900/40">
                  <li className="flex gap-1.5"><Check className="w-3 h-3 text-[#00D09C] mt-0.5" /> One-tap skip from dashboard</li>
                  <li className="flex gap-1.5"><Check className="w-3 h-3 text-[#00D09C] mt-0.5" /> Eval-gate classifies intent</li>
                  <li className="flex gap-1.5"><Check className="w-3 h-3 text-[#00D09C] mt-0.5" /> Streak & mandate preserved</li>
                  <li className="flex gap-1.5"><Check className="w-3 h-3 text-[#00D09C] mt-0.5" /> SEBI advisory guardrail</li>
                  <li className="flex gap-1.5"><Check className="w-3 h-3 text-[#00D09C] mt-0.5" /> Bank cutoff detection</li>
                </ul>
              )}
            </div>
          )}

          {/* Eval-gate status indicator (To-Be only) */}
          {mode === 'to-be' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Eval-Gate Status</h4>
              <div className={`text-xs font-bold flex items-center gap-1.5 ${
                evalScenario === 'cashflow' ? 'text-emerald-400' :
                evalScenario === 'advisory' ? 'text-rose-400' :
                evalScenario === 'cutoff' ? 'text-amber-400' : 'text-slate-400'
              }`}>
                {evalScenario === 'cashflow' && <CheckCircle2 className="w-4 h-4" />}
                {evalScenario === 'advisory' && <ShieldAlert className="w-4 h-4" />}
                {evalScenario === 'cutoff' && <AlertTriangle className="w-4 h-4" />}
                <span className="capitalize">{evalScenario}</span>
              </div>
            </div>
          )}
        </div>

        {/* Centre: phone frame */}
        <div className="order-1 lg:order-2 mx-auto">
          <div className="relative w-[375px] h-[667px] bg-white rounded-[2.5rem] shadow-2xl border-[8px] border-slate-800 overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50" />

            {/* Phone status bar */}
            <div className="pt-7 px-4 pb-1 bg-white flex items-center justify-between text-[10px] text-slate-700 font-semibold">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2.5 rounded-sm border border-slate-400 inline-block" />
                <span>5G</span>
                <Bell className="w-3 h-3" />
              </span>
            </div>

            {/* ─── Screen: Dashboard ─── */}
            {screen === 'dashboard' && (
              <DashboardScreen
                mode={mode}
                sips={sips}
                activeSip={activeSip}
                onSelectSip={(id) => { setSelectedSipId(id); setScreen('details'); }}
                onQuickSkip={() => setShowQuickSkipSheet(true)}
                showAnnotations={showAnnotations}
              />
            )}

            {/* ─── Screen: SIP Details ─── */}
            {screen === 'details' && (
              <DetailsScreen
                mode={mode}
                sip={activeSip}
                onBack={() => setScreen('dashboard')}
                onOpenThreeDot={() => asIsCancelStep('open-menu')}
                showThreeDotMenu={showThreeDotMenu}
                onEditSip={() => asIsCancelStep('edit')}
                showEditSubMenu={showEditSubMenu}
                onCancelConfirm={() => asIsCancelStep('cancel-confirm')}
                asIsActionLog={asIsActionLog}
                onCancelFinal={() => asIsCancelStep('cancel-final')}
                onOpenAiIntercept={() => setShowAiInterceptModal(true)}
                showAnnotations={showAnnotations}
              />
            )}

            {/* ─── Quick Skip Sheet (To-Be) ─── */}
            {showQuickSkipSheet && mode === 'to-be' && (
              <QuickSkipSheet
                sip={activeSip}
                onClose={() => setShowQuickSkipSheet(false)}
                onSkip={() => applyOneTapSkip('Quick Skip Sheet')}
                onShowAiIntercept={() => { setShowQuickSkipSheet(false); setShowAiInterceptModal(true); }}
              />
            )}

            {/* ─── AI Intercept Modal (To-Be) ─── */}
            {showAiInterceptModal && (
              <AiInterceptModal
                activeSip={activeSip}
                evalScenario={evalScenario}
                userReasonInput={userReasonInput}
                setUserReasonInput={setUserReasonInput}
                runEvalGate={runEvalGate}
                onClose={() => setShowAiInterceptModal(false)}
                onSkip={() => applyOneTapSkip('AI Cancel-Screen Intercept')}
                onPermanentCancel={applyPermanentCancel}
                onScenarioClick={(scenario) => {
                  setUserReasonInput(scenario.text);
                  setEvalScenario(scenario.state);
                }}
              />
            )}

            {/* ─── MVP Toast ─── */}
            {mvpToast && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 max-w-[90%]">
                <div className="bg-slate-900 text-white text-[11px] font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-[#00D09C]/30 flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0" />
                  <span>{mvpToast}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: metrics / info */}
        <div className="lg:w-64 shrink-0 order-3 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Demo Metrics</h4>
            <div className="space-y-2">
              <Metric label="Total SIPs" value={sips.length} />
              <Metric label="Active" value={sips.filter(s => s.status === 'Active').length} />
              <Metric label="Snoozed" value={sips.filter(s => s.status.includes('Snoozed')).length} />
              <Metric label="Cancelled" value={sips.filter(s => s.status.includes('Cancelled')).length} />
            </div>
          </div>

          {mode === 'to-be' && (
            <div className="bg-gradient-to-br from-[#00D09C]/10 to-transparent border border-[#00D09C]/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00D09C]" />
                <h4 className="text-xs font-bold text-[#00D09C]">Retention Impact</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                By offering a 1-month skip instead of permanent cancellation, the AI intercept
                can reduce SIP churn by up to 40% for temporary cashflow issues.
              </p>
            </div>
          )}

          <Disclaimer className="bg-slate-900 border border-slate-800 rounded-2xl p-4" />
        </div>
      </div>

      {/* Bottom persistent app footer */}
      <div className="max-w-6xl mx-auto px-6 mt-6">
        <div className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-slate-500 text-center">
          Disclaimer: Operational SIP management assistant — No investment advice.
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-200">{value}</span>
    </div>
  );
}

function SipCard({ sip, onClick, showAnnotations, mode, onQuickSkip }) {
  const isSnoozed = sip.status.includes('Snoozed');
  const isCancelled = sip.status.includes('Cancelled');

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-3.5 cursor-pointer hover:border-slate-300 transition relative group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${sip.logoBg} text-white flex items-center justify-center text-xs font-extrabold shrink-0`}>
          {sip.logoText}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900 truncate">{sip.name}</h4>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-slate-400" />
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{sip.category}</p>
          <div className="flex items-center gap-3 mt-2">
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Amount</p>
              <p className="text-xs font-bold text-slate-900">{formatINR(sip.amount)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Next Debit</p>
              <p className="text-xs font-bold text-slate-700">{sip.nextDebit}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Returns</p>
              <p className="text-xs font-bold text-emerald-600">{sip.returns}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
              sip.status === 'Active'
                ? 'bg-emerald-50 text-emerald-700'
                : isSnoozed
                ? 'bg-amber-50 text-amber-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              {sip.status === 'Active' && <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />}
              {isSnoozed && <PauseCircle className="w-2.5 h-2.5 inline mr-0.5" />}
              {isCancelled && <XCircle className="w-2.5 h-2.5 inline mr-0.5" />}
              {sip.status}
            </span>
            {sip.status === 'Active' && (
              <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                {sip.streakMonths} mo streak
              </span>
            )}
          </div>
        </div>
      </div>

      {/* To-Be: quick skip button on the card */}
      {mode === 'to-be' && sip.status === 'Active' && (
        <button
          onClick={(e) => { e.stopPropagation(); onQuickSkip(); }}
          className="mt-2.5 w-full py-2 rounded-xl bg-[#00D09C]/10 hover:bg-[#00D09C]/20 text-[#008765] text-[11px] font-bold transition flex items-center justify-center gap-1.5"
        >
          <PauseCircle className="w-3.5 h-3.5" />
          Skip 1 Month Free
        </button>
      )}

      {showAnnotations && mode === 'as-is' && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full">
          <div className="bg-rose-600 text-white text-[8px] font-bold px-1.5 py-1 rounded whitespace-nowrap">
            No skip option
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardScreen({ mode, sips, activeSip, onSelectSip, onQuickSkip, showAnnotations }) {
  return (
    <div className="h-[calc(667px-1.75rem)] overflow-y-auto bg-slate-50">
      {/* Groww-style header */}
      <div className="bg-[#00D09C] px-4 py-3 text-slate-950">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold">My SIPs</h2>
          <Bell className="w-5 h-5" />
        </div>
        <p className="text-[10px] text-slate-900/70 mt-0.5">{sips.length} active systematic plans</p>
      </div>

      {/* Summary card */}
      <div className="px-4 pt-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Invested</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatINR(sips.reduce((sum, s) => sum + s.totalInvested, 0))}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-600">
              {formatINR(sips.reduce((sum, s) => sum + s.currentValue, 0))} current value
            </p>
          </div>
        </div>
      </div>

      {/* SIP list */}
      <div className="px-4 pt-4 pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700">Your SIPs</h3>
          {mode === 'to-be' && (
            <span className="text-[10px] text-[#008765] font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI-protected
            </span>
          )}
        </div>
        {sips.map(sip => (
          <SipCard
            key={sip.id}
            sip={sip}
            onClick={() => onSelectSip(sip.id)}
            mode={mode}
            onQuickSkip={onQuickSkip}
            showAnnotations={showAnnotations}
          />
        ))}
      </div>
    </div>
  );
}

function DetailsScreen({
  mode, sip, onBack, onOpenThreeDot, showThreeDotMenu, onEditSip,
  showEditSubMenu, onCancelConfirm, asIsActionLog, onCancelFinal,
  onOpenAiIntercept, showAnnotations,
}) {
  const isSnoozed = sip.status.includes('Snoozed');
  const isCancelled = sip.status.includes('Cancelled');

  return (
    <div className="h-[calc(667px-1.75rem)] overflow-y-auto bg-slate-50 relative">
      {/* Header */}
      <div className="bg-[#00D09C] px-4 py-3 text-slate-950 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-1 -ml-1 hover:bg-black/10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-extrabold">SIP Details</h2>
          {mode === 'as-is' ? (
            <button onClick={onOpenThreeDot} className="p-1 -mr-1 hover:bg-black/10 rounded-lg">
              <MoreVertical className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-7" />
          )}
        </div>
      </div>

      {/* Three-dot dropdown (As-Is) */}
      {showThreeDotMenu && mode === 'as-is' && (
        <div className="absolute top-12 right-3 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1 w-40">
          <button
            onClick={onEditSip}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Edit SIP
          </button>
          <button
            onClick={onEditSip}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel SIP
          </button>
        </div>
      )}

      {/* Fund info */}
      <div className="px-4 pt-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${sip.logoBg} text-white flex items-center justify-center text-sm font-extrabold`}>
              {sip.logoText}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">{sip.name}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{sip.category}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <DetailBox label="SIP Amount" value={formatINR(sip.amount)} />
            <DetailBox label="Next Debit" value={sip.nextDebit} />
            <DetailBox label="Total Invested" value={formatINR(sip.totalInvested)} />
            <DetailBox label="Current Value" value={formatINR(sip.currentValue)} />
            <DetailBox label="Returns" value={sip.returns} valueClass="text-emerald-600" />
            <DetailBox label="Streak" value={`${sip.streakMonths} months`} />
          </div>
          <div className="mt-3">
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              sip.status === 'Active'
                ? 'bg-emerald-50 text-emerald-700'
                : isSnoozed
                ? 'bg-amber-50 text-amber-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              {sip.status === 'Active' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
              {isSnoozed && <PauseCircle className="w-3 h-3 inline mr-1" />}
              {isCancelled && <XCircle className="w-3 h-3 inline mr-1" />}
              {sip.status}
            </span>
          </div>
        </div>
      </div>

      {/* As-Is: Edit/Cancel sub-menu */}
      {showEditSubMenu && mode === 'as-is' && (
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 px-1">Edit SIP</h4>
            <button className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between">
              <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Change debit date</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <button className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between">
              <span className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-slate-400" /> Change amount</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <button
              onClick={onCancelConfirm}
              className="w-full px-3 py-2.5 rounded-xl border border-rose-200 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel SIP Permanently
            </button>
          </div>
        </div>
      )}

      {/* As-Is: Cancel confirmation */}
      {asIsActionLog === 'confirm-prompt' && mode === 'as-is' && (
        <div className="px-4 mt-3">
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-rose-950">Cancel SIP?</h4>
                <p className="text-[11px] text-rose-900 mt-1 leading-relaxed">
                  This will permanently terminate your e-NACH mandate. Your {sip.streakMonths}-month
                  investment streak will be lost. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancelFinal}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Yes, Cancel Permanently
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* As-Is: Cancelled state */}
      {isCancelled && mode === 'as-is' && (
        <div className="px-4 mt-3">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
            <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-rose-900 mt-2">SIP Cancelled</p>
            <p className="text-[10px] text-rose-700 mt-1">Your e-NACH mandate has been terminated.</p>
          </div>
        </div>
      )}

      {/* To-Be: AI intercept button */}
      {mode === 'to-be' && !isCancelled && (
        <div className="px-4 mt-3 space-y-2">
          {sip.status === 'Active' && (
            <button
              onClick={onOpenAiIntercept}
              className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <MoreVertical className="w-4 h-4" /> Manage / Cancel SIP
            </button>
          )}
          {isSnoozed && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <PauseCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs font-bold text-amber-900 mt-2">SIP Snoozed for Nov 2026</p>
              <p className="text-[10px] text-amber-700 mt-1">
                Auto-resumes on 10 Dec 2026. Your streak and mandate are safe.
              </p>
            </div>
          )}
        </div>
      )}

      {showAnnotations && mode === 'as-is' && !isCancelled && !showEditSubMenu && !asIsActionLog && (
        <div className="px-4 mt-3">
          <div className="bg-rose-50 border border-dashed border-rose-300 rounded-xl p-3">
            <p className="text-[10px] text-rose-700 font-semibold flex items-center gap-1">
              <Info className="w-3 h-3" /> No "skip" option exists — user must cancel permanently.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBox({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div>
      <p className="text-[9px] text-slate-400 uppercase font-semibold">{label}</p>
      <p className={`text-sm font-bold ${valueClass} mt-0.5`}>{value}</p>
    </div>
  );
}

function QuickSkipSheet({ sip, onClose, onSkip, onShowAiIntercept }) {
  return (
    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs z-30 flex items-end">
      <div className="bg-white w-full max-h-[80%] overflow-y-auto rounded-t-3xl p-4 space-y-3.5 border-t border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-[#00D09C]" />
            <h4 className="text-sm font-extrabold text-slate-900">Skip 1 Month Free</h4>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-emerald-950">
              Protect your {sip.streakMonths}-month streak!
            </span>
          </div>
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            Skip your <strong>Nov 2026</strong> installment with <strong>zero penalty</strong>.
            Your e-NACH mandate stays active and auto-resumes on <strong>10 Dec 2026</strong>.
          </p>
        </div>

        <button
          onClick={onSkip}
          className="w-full py-3 rounded-xl bg-[#00D09C] hover:bg-[#00b889] text-slate-950 font-extrabold text-sm transition shadow-md"
        >
          Skip Nov 2026 — Free (No Penalty)
        </button>

        <button
          onClick={onShowAiIntercept}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#008765]" />
          Or let AI help me decide
        </button>

        <p className="text-[9px] text-slate-400 text-center">
          You can skip 1 month per financial year. Streak continues on resume.
        </p>
      </div>
    </div>
  );
}

function AiInterceptModal({
  activeSip, evalScenario, userReasonInput, setUserReasonInput, runEvalGate,
  onClose, onSkip, onPermanentCancel, onScenarioClick,
}) {
  return (
    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs z-30 flex items-end">
      <div className="bg-white w-full max-h-[92%] overflow-y-auto rounded-t-3xl p-4 space-y-3.5 border-t border-slate-200">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00D09C]/20 text-[#008765] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">
                Groww AI Retention &amp; Mandate Guard
              </h4>
              <p className="text-[10px] text-slate-500">
                Eval-Gated Cancel Intercept • Golden Set Verified
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset test chips */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Click a Test Scenario (or type below):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TEST_SCENARIOS.map(scenario => (
              <button
                key={scenario.state}
                onClick={() => onScenarioClick(scenario)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                  evalScenario === scenario.state
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>

        {/* Free-text input */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 block">
            Tell us briefly why you're cancelling so we can check your mandate:
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={userReasonInput}
              onChange={e => {
                setUserReasonInput(e.target.value);
                runEvalGate(e.target.value);
              }}
              placeholder="Type reason (e.g., cash crunch, market crash, debit tomorrow)..."
              className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#00D09C]"
            />
            <button
              onClick={() => runEvalGate(userReasonInput)}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Dynamic Eval-Gate output */}
        {evalScenario === 'cashflow' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] font-bold text-emerald-950 leading-snug">
                Eval-Gate Passed: Operational Cashflow Intent | NACH Window: Safe (T-7 Days)
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00D09C] flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                  Protect Your {activeSip.streakMonths}-Month Streak!
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  4 mo to 1-yr milestone
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                You don't need to delete your mandate for a 1-month cash crunch. Because your next debit (
                <strong>10 Nov</strong>) is 7 days away, you can{' '}
                <strong>Skip 1 Month Free</strong> right now with{' '}
                <strong>{'\u20B90'} bank bounce penalty</strong>.
              </p>
              <button
                onClick={onSkip}
                className="w-full py-2.5 rounded-xl bg-[#00D09C] hover:bg-[#00b889] text-slate-950 font-extrabold text-xs shadow-md transition"
              >
                Skip 1 Month Free ({'\u20B90'} Penalty)
              </button>
            </div>
          </div>
        )}

        {evalScenario === 'advisory' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-400 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-extrabold text-rose-950">
                    AI Safety Fallback (SEBI Non-Advisory Guardrail)
                  </div>
                  <p className="text-[11px] text-rose-900 mt-1 leading-relaxed">
                    Groww AI Assistant is strictly an operational SIP tool and{' '}
                    <strong>cannot provide investment advice, predict market returns, or recommend mutual
                    funds</strong>.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-rose-200 flex items-center justify-between text-[11px]">
                <span className="text-rose-800 font-medium">
                  Please consult a SEBI-registered advisor.
                </span>
                <a
                  href="#official-sid"
                  onClick={e => e.preventDefault()}
                  className="font-bold text-rose-700 underline flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> Official SID
                </a>
              </div>
            </div>
          </div>
        )}

        {evalScenario === 'cutoff' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-400 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-extrabold text-amber-950">
                    Bank Cutoff Alert (T&lt;5 Days Lock-In)
                  </div>
                  <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                    Because your SIP debit is <strong>less than 5 working days away</strong>, bank e-NACH
                    batch files are already locked. A 1-tap skip or cancellation today{' '}
                    <strong>cannot stop tomorrow's deduction</strong>.
                  </p>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/80 border border-amber-300 text-[11px] text-amber-950">
                <strong>Recommended Action:</strong> Please maintain {formatINR(activeSip.amount)} in
                your linked bank account for tomorrow's cycle to avoid a {'\u20B9250'}-{'\u20B9590'} bank NACH bounce charge.
              </div>
              <div className="pt-1 flex justify-end">
                <a
                  href="#nach-policy"
                  onClick={e => e.preventDefault()}
                  className="text-[11px] font-bold text-amber-800 underline flex items-center gap-1"
                >
                  View Official e-NACH Cutoff Policy →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Permanent cancel option (always available at bottom) */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={onPermanentCancel}
            className="w-full py-2 rounded-xl text-rose-600 text-[11px] font-bold hover:bg-rose-50 transition flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            I understand — Cancel SIP permanently
          </button>
        </div>

        {/* Persistent disclaimer */}
        <Disclaimer className="pt-2" />
      </div>
    </div>
  );
}
