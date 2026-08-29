import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, NavigationTab } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { DashboardView } from './components/DashboardView.js';
import { MedicinesView } from './components/MedicinesView.js';
import { ScheduleView } from './components/ScheduleView.js';
import { ReminderCenterView } from './components/ReminderCenterView.js';
import { VerificationView } from './components/VerificationView.js';
import { AnalyticsView } from './components/AnalyticsView.js';
import { AiRiskView } from './components/AiRiskView.js';
import { HistoryView } from './components/HistoryView.js';
import { SettingsView } from './components/SettingsView.js';
import { MedicineModal } from './components/MedicineModal.js';
import { AiAssistantModal } from './components/AiAssistantModal.js';
import { AuthView } from './components/AuthView.js';
import {
  fetchPatient,
  fetchMedicines,
  fetchEvents,
  fetchAlerts,
  fetchMetrics,
  fetchSettings,
  updatePatient,
  updateSettings,
  saveMedicine,
  deleteMedicine,
  recordDose,
  verifyDose,
  acknowledgeAlert,
  createAlert,
  seedDemoData,
  resetDatabase,
  authenticate,
  authenticateDemo,
  createAccount,
  restoreSession,
  fetchCaregiverInvitations,
  decideCaregiverInvitation,
  fetchCaregiverLinks,
  fetchCaregiverPatientSummary,
  acknowledgeCaregiverAlert,
  fetchCaregiverAccess,
  revokeCaregiverLink,
  generateCaretakerAccessCode,
  fetchCurrentCaretakerAccessCode,
  requestCaretakerAccess,
  decideCaretakerAccessRequest,
  fetchCaregiverNotifications,
  markCaregiverNotificationRead,
  selectAccountRole,
} from './utils/api.js';
import {
  PatientProfile,
  Medicine,
  MedicationEvent,
  Alert,
  AdherenceMetrics,
  AppSettings,
  CaregiverContact,
  AuthSession,
  CaregiverInvitation,
  CaregiverLink,
} from './types.js';
import { CaregiverPortal } from './components/CaregiverPortal.js';
import { RoleSelectionView } from './components/RoleSelectionView.js';
import { PatientMessagesPage } from './components/PatientMessagesPage.js';
import { playReminderChime } from './utils/audio.js';
import { useAuth } from './auth/AuthProvider.js';
import { SplashScreen } from './pages/SplashScreen.js';

export function App() {
  const firebaseAuth = useAuth();
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sessionUid, setSessionUid] = useState<string | null>(null);
  const sessionRequestId = useRef(0);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [events, setEvents] = useState<MedicationEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<AdherenceMetrics | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [caregivers, setCaregivers] = useState<CaregiverContact[]>([]);
  const [caregiverInvitations, setCaregiverInvitations] = useState<CaregiverInvitation[]>([]);
  const [caregiverLinks, setCaregiverLinks] = useState<CaregiverLink[]>([]);
  const [caregiverSummary, setCaregiverSummary] = useState<any>(null);
  const [caregiverAccess, setCaregiverAccess] = useState<{ invitations: any[]; links: any[] }>({ invitations: [], links: [] });
  const [caregiverNotifications, setCaregiverNotifications] = useState<any[]>([]);

  // Modals & Active state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [activeVerificationEvent, setActiveVerificationEvent] =
    useState<MedicationEvent | null>(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Time & Greeting
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const isDemoMode = authSession?.user.email === 'demo@mediguard.ai';
  const isCaregiver = authSession?.role === 'Caregiver';
  const loadCurrentCaretakerCode = useCallback(fetchCurrentCaretakerAccessCode, []);
  const needsRoleSelection = Boolean(authSession && (authSession.role === null || authSession.role === undefined));

  const clearPatientState = () => {
    setPatient(null);
    setMedicines([]);
    setEvents([]);
    setAlerts([]);
    setMetrics(null);
    setSettings(null);
    setCaregivers([]);
  };

  // Load all app data
  const loadAllData = useCallback(async () => {
    try {
      const [p, m, e, a, met, s] = await Promise.all([
        fetchPatient(),
        fetchMedicines(),
        fetchEvents(),
        fetchAlerts(),
        fetchMetrics(),
        fetchSettings(),
      ]);
      setPatient(p);
      if (firebaseAuth.currentUser) {
        setPatient({
          ...p,
          name: firebaseAuth.currentUser.displayName || p.name,
          avatarUrl: firebaseAuth.currentUser.photoURL || p.avatarUrl,
        });
      }
      setMedicines(Array.isArray(m) ? m : []);
      setEvents(Array.isArray(e) ? e : []);
      setAlerts(Array.isArray(a) ? a : []);
      setMetrics(met && typeof met === 'object' && !('error' in met) ? met : null);
      setSettings(s?.settings || null);
      setCaregivers(Array.isArray(s?.caregivers) ? s.caregivers : []);
      fetchCaregiverAccess().then(setCaregiverAccess).catch(() => setCaregiverAccess({ invitations: [], links: [] }));
    } catch (err) {
      console.error('Error loading app data:', err);
    }
  }, [firebaseAuth.currentUser?.uid]);

  useEffect(() => {
    const token = window.sessionStorage.getItem('mediguard_session');
    let cancelled = false;
    let timeoutHandle: NodeJS.Timeout;
    const requestId = ++sessionRequestId.current;
    const firebaseUid = firebaseAuth.currentUser?.uid || null;
    
    const loadSession = async () => {
      if (cancelled || requestId !== sessionRequestId.current) return;
      
      try {
        const session = await restoreSession(token || undefined);
        if (cancelled || requestId !== sessionRequestId.current) return;
        
        const resolvedUid = firebaseUid || session?.user.id || null;
        if (import.meta.env.DEV) console.log('[MediGuard role trace]', { firebaseUid, sessionUserId: session?.user.id, role: session?.role ?? session?.user.role ?? null, route: window.location.pathname });
        
        setAuthSession(session);
        setSessionUid(resolvedUid);
        setSessionError('');
      } catch (error: any) {
        if (cancelled || requestId !== sessionRequestId.current) return;
        
        console.error('[MediGuard session] Backend session failed:', { endpoint: error?.endpoint || '/api/auth/session', status: error?.status, message: error?.message });
        if (token) window.sessionStorage.removeItem('mediguard_session');
        
        if (firebaseUid) {
          setSessionError('Signed in successfully, but MediGuard could not load your account session.');
        } else {
          // Allow app to proceed without session for guests
          setAuthSession(null);
          setSessionUid(null);
        }
      } finally {
        if (!cancelled && requestId === sessionRequestId.current) { 
          setProfileLoading(false);
          setAuthChecked(true);
        }
      }
    };

    setAuthSession(null);
    setSessionUid(null);
    setSessionError('');
    clearPatientState();
    setCaregiverInvitations([]);
    setCaregiverLinks([]);
    setCaregiverSummary(null);
    setCaregiverNotifications([]);
    setProfileLoading(true);
    
    loadSession();
    
    timeoutHandle = setTimeout(() => {
      if (!cancelled && requestId === sessionRequestId.current && profileLoading) {
        console.warn('[MediGuard session] Timeout after 10s, proceeding anyway');
        setProfileLoading(false);
        setAuthChecked(true);
      }
    }, 10000);
    
    return () => { 
      cancelled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [firebaseAuth.currentUser?.uid]);

  useEffect(() => {
    if ((authSession || firebaseAuth.currentUser) && !isCaregiver) {
      setPatient(null);
      setMedicines([]);
      setEvents([]);
      setAlerts([]);
      setMetrics(null);
      setSettings(null);
      setCaregivers([]);
      loadAllData();
    }
  }, [authSession, firebaseAuth.currentUser, loadAllData]);

  useEffect(() => {
    if (!isCaregiver) return;
    Promise.all([fetchCaregiverInvitations(), fetchCaregiverLinks(), fetchCaregiverNotifications()]).then(async ([invitations, links, notifications]) => {
      setCaregiverInvitations(Array.isArray(invitations) ? invitations : []);
      setCaregiverLinks(Array.isArray(links) ? links : []);
      setCaregiverNotifications(Array.isArray(notifications) ? notifications : []);
      if (links[0]) setCaregiverSummary(await fetchCaregiverPatientSummary(links[0].patientId));
    }).catch((error) => console.error('Error loading caregiver portal:', error));
  }, [isCaregiver, firebaseAuth.currentUser?.uid]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/app/messages') setCurrentTab('messages');
    else if (path === '/app/dashboard') setCurrentTab('dashboard');
    else if (path === '/app/medicines') setCurrentTab('medicines');
    else if (path === '/app/schedule') setCurrentTab('schedule');
    else if (path === '/app/reminders') setCurrentTab('reminders');
    else if (path === '/app/verification') setCurrentTab('verification');
    else if (path === '/app/analytics') setCurrentTab('analytics');
    else if (path === '/app/airisk') setCurrentTab('airisk');
    else if (path === '/app/history') setCurrentTab('history');
    else if (path === '/app/settings') setCurrentTab('settings');
    else if (path === '/caretaker/messages') setCurrentTab('messages');
  }, [window.location.pathname]);

  const handleAuthenticated = (session: AuthSession) => {
    window.sessionStorage.setItem('mediguard_session', session.token);
    setAuthSession(session);
  };

  // Keep hook order stable while switching between auth and the app shell.
  useEffect(() => {
    const timer = setInterval(() => {
      const offsetMs = isDemoMode ? (settings?.simulatedTimeOffsetMinutes || 0) * 60000 : 0;
      setCurrentTime(new Date(Date.now() + offsetMs));
    }, 1000);
    return () => clearInterval(timer);
  }, [isDemoMode, settings?.simulatedTimeOffsetMinutes]);

  if (firebaseAuth.loading || !authChecked || profileLoading) return <SplashScreen />;
  if (!firebaseAuth.currentUser && !authSession) {
    return <AuthView
      onAuthenticated={handleAuthenticated}
      onEmailLogin={firebaseAuth.loginWithEmail}
      onCreateAccount={firebaseAuth.signupWithEmail}
      onGoogleLogin={firebaseAuth.loginWithGoogle}
      onPhoneLogin={firebaseAuth.requestPhoneLogin}
      onResetPassword={firebaseAuth.sendResetEmail}
      firebaseConfigured={firebaseAuth.configured}
      authError={firebaseAuth.error}
      onDemoLogin={authenticateDemo}
    />;
  }

  if (firebaseAuth.currentUser && (!authSession || sessionUid !== firebaseAuth.currentUser.uid)) {
    return sessionError ? <main className="min-h-screen bg-[#F4F7FB] grid place-items-center p-6"><div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm"><h1 className="text-lg font-bold text-slate-900">MediGuard session unavailable</h1><p className="text-sm text-slate-500 mt-2">{sessionError}</p><button onClick={() => window.location.reload()} className="mt-5 px-4 py-2 rounded-xl bg-[#0B1F33] text-white text-sm font-bold">Retry</button></div></main> : <SplashScreen />;
  }

  if (needsRoleSelection) {
    if (window.location.pathname !== '/choose-role') window.history.replaceState({}, '', '/choose-role');
    if (import.meta.env.DEV) console.log('[MediGuard role trace]', { role: null, route: '/choose-role' });
    return <RoleSelectionView onSelect={async (role) => {
      const selected = await selectAccountRole(role);
      setAuthSession((current) => current ? { ...current, role, user: { ...current.user, role }, patient: selected.patient || current.patient } : current);
      window.history.replaceState({}, '', role === 'Caregiver' ? '/caretaker/dashboard' : '/app/dashboard');
    }} />;
  }

  if (isCaregiver) {
    if (!window.location.pathname.startsWith('/caretaker')) window.history.replaceState({}, '', '/caretaker/dashboard');
    const caregiverLogout = async () => {
      setCaregiverInvitations([]); setCaregiverLinks([]); setCaregiverSummary(null); setAuthSession(null);
      window.sessionStorage.removeItem('mediguard_session');
      if (firebaseAuth.currentUser) await firebaseAuth.logout();
    };
    return <CaregiverPortal
      name={firebaseAuth.currentUser?.displayName || authSession?.user.fullName || 'Caregiver'}
      invitations={caregiverInvitations}
      links={caregiverLinks}
      summary={caregiverSummary}
      notifications={caregiverNotifications}
      onMarkNotificationRead={async (id) => { await markCaregiverNotificationRead(id); setCaregiverNotifications(await fetchCaregiverNotifications()); }}
      onDecision={async (id, decision) => { await decideCaregiverInvitation(id, decision); const next = await fetchCaregiverInvitations(); setCaregiverInvitations(next); const links = await fetchCaregiverLinks(); setCaregiverLinks(links); if (links[0]) setCaregiverSummary(await fetchCaregiverPatientSummary(links[0].patientId)); }}
      onRequestAccess={async (patientEmail, accessCode) => { await requestCaretakerAccess({ patientEmail, accessCode }); const next = await fetchCaregiverInvitations(); setCaregiverInvitations(next); }}
      onSelectPatient={async (id) => setCaregiverSummary(await fetchCaregiverPatientSummary(id))}
      onAcknowledge={async (id) => { await acknowledgeCaregiverAlert(id); if (caregiverSummary?.link?.patientId) setCaregiverSummary(await fetchCaregiverPatientSummary(caregiverSummary.link.patientId)); }}
      onLogout={caregiverLogout}
    />;
  }

  if (!isCaregiver && window.location.pathname.startsWith('/caretaker')) {
    window.history.replaceState({}, '', '/app/dashboard');
  }

  // Derive simulated time display string
  const simulatedTimeText = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: patient?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Calculate greeting
  const currentHour = currentTime.getHours();
  let greetingText = 'Good Morning';
  if (currentHour >= 12 && currentHour < 17) {
    greetingText = 'Good Afternoon';
  } else if (currentHour >= 17) {
    greetingText = 'Good Evening';
  }

  // Filter today's events
  const todayStr = currentTime.toISOString().split('T')[0];
  const todayEvents = events.filter((e) => e.scheduledDate === todayStr);
  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  // Handlers
  const handleRecordDose = async (eventId: string, status?: string) => {
    try {
      const actualTime = currentTime.toTimeString().slice(0, 5);
      const actualDate = currentTime.toISOString().split('T')[0];
      await recordDose({ eventId, status, actualTime, actualDate });
      if (status !== 'Missed' && settings?.audioAlerts) {
        playReminderChime('success');
      }
      await loadAllData();
    } catch (e) {
      console.error('Error recording dose:', e);
    }
  };

  const handleOpenVerification = (event: MedicationEvent) => {
    setActiveVerificationEvent(event);
    setCurrentTab('verification');
  };

  const handleVerifyDose = async (payload: {
    eventId: string;
    scannedCode: string;
    method?: 'QR' | 'Barcode' | 'Manual';
  }) => {
    const result = await verifyDose({
      ...payload,
      actualTime: currentTime.toTimeString().slice(0, 5),
      actualDate: currentTime.toISOString().split('T')[0],
    });
    await loadAllData();
    return result;
  };

  const handleSaveMedicine = async (medData: Partial<Medicine>) => {
    await saveMedicine(medData);
    await loadAllData();
  };

  const handleDeleteMedicine = async (id: string) => {
    await deleteMedicine(id);
    await loadAllData();
  };

  const handleToggleMedicineActive = async (id: string, active: boolean) => {
    await saveMedicine({ id, active });
    await loadAllData();
  };

  const handleAcknowledgeAlert = async (
    id: string,
    acknowledgedBy: string,
    actionTaken?: string
  ) => {
    await acknowledgeAlert(id, acknowledgedBy, actionTaken);
    await loadAllData();
  };

  const handleTriggerTestAlert = async (
    type: 'MISSED_DOSE' | 'WRONG_MEDICINE' | 'REFILL_NEEDED'
  ) => {
    const messages = {
      MISSED_DOSE: `High Priority Alert: Eleanor Vance missed scheduled dose of Metformin HCl (500 mg). Escalation triggered.`,
      WRONG_MEDICINE: `CRITICAL SAFETY ALERT: Wrong medicine scanned! Scanned "Lisinopril 10mg" instead of "Metformin 500mg". Intake blocked.`,
      REFILL_NEEDED: `Inventory Alert: Atorvastatin Calcium is low on stock (3 doses left). Arrange prescription refill.`,
    };

    const priorities = {
      MISSED_DOSE: 'HIGH' as const,
      WRONG_MEDICINE: 'CRITICAL' as const,
      REFILL_NEEDED: 'MEDIUM' as const,
    };

    await createAlert({
      patientId: patient?.id,
      medicineName: 'Metformin HCl',
      alertType: type,
      message: messages[type],
      priority: priorities[type],
    });

    if (settings?.audioAlerts) {
      playReminderChime('warning');
    }
    await loadAllData();
  };

  const handleLoadDemoData = async () => {
    await seedDemoData();
    await loadAllData();
  };

  const handleResetDatabase = async () => {
    await resetDatabase();
    await loadAllData();
  };

  const handleToggleSound = async () => {
    if (settings) {
      await updateSettings({ audioAlerts: !settings.audioAlerts });
      await loadAllData();
    }
  };

  // Header Titles
  const tabTitles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Executive Dashboard',
      subtitle: 'Real-time overview of active prescriptions, dose compliance, and AI risk analysis',
    },
    medicines: {
      title: 'My Prescriptions',
      subtitle: 'Active medicines catalog, dosage forms, guidelines, and bedside QR labels',
    },
    schedule: {
      title: 'Daily Medication Schedule',
      subtitle: 'Time-grouped slots with direct intake logging and optical verification',
    },
    reminders: {
      title: 'Intelligent Reminder Center',
      subtitle: 'Time-aware classification into Upcoming, Due Now, Delayed, and Missed states',
    },
    verification: {
      title: 'Optical Medicine Verification',
      subtitle: 'QR & Barcode scanner safety check to prevent accidental wrong-pill administration',
    },
    analytics: {
      title: 'Adherence Analytics Dashboard',
      subtitle: 'Longitudinal trend curves, dose status distribution, and time-of-day compliance charts',
    },
    airisk: {
      title: 'AI Adherence Risk & Behavior Prediction',
      subtitle: 'Machine learning friction analysis, future dose risk index, and Gemini clinical report',
    },
    caregivers: {
      title: 'Caregiver Support & Alert Portal',
      subtitle: 'Priority incident queue, emergency escalation simulation, and clinical sign-off notes',
    },
    history: {
      title: 'Medication Intake Audit History',
      subtitle: 'Cryptographic intake timestamp audit log with CSV export capability',
    },
    messages: {
      title: 'Messages',
      subtitle: 'Secure communication with your connected caregiver',
    },
    settings: {
      title: 'Settings & Demonstration Controls',
      subtitle: 'Patient clinical demographics, time-travel simulator, and 14-day sample dataset loader',
    },
  };

  return (
    <div className="flex bg-[#F5F8FC] min-h-screen text-slate-800 antialiased font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'messages') window.history.replaceState({}, '', '/app/messages');
          else if (tab === 'dashboard') window.history.replaceState({}, '', '/app/dashboard');
          else if (tab === 'medicines') window.history.replaceState({}, '', '/app/medicines');
          else if (tab === 'schedule') window.history.replaceState({}, '', '/app/schedule');
          else if (tab === 'reminders') window.history.replaceState({}, '', '/app/reminders');
          else if (tab === 'verification') window.history.replaceState({}, '', '/app/verification');
          else if (tab === 'analytics') window.history.replaceState({}, '', '/app/analytics');
          else if (tab === 'airisk') window.history.replaceState({}, '', '/app/airisk');
          else if (tab === 'history') window.history.replaceState({}, '', '/app/history');
          else if (tab === 'settings') window.history.replaceState({}, '', '/app/settings');
        }}
        patient={patient}
        activeAlertsCount={activeAlertsCount}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Header
          title={tabTitles[currentTab].title}
          subtitle={tabTitles[currentTab].subtitle}
          patient={patient}
          settings={settings}
          onRefreshData={loadAllData}
          onToggleSound={handleToggleSound}
          simulatedTimeText={simulatedTimeText}
          activeAlertsCount={activeAlertsCount}
          onOpenCaregivers={() => setCurrentTab('caregivers')}
          demoMode={isDemoMode}
          onLogout={async () => {
            clearPatientState();
            window.sessionStorage.removeItem('mediguard_session');
            setAuthSession(null);
            if (firebaseAuth.currentUser) await firebaseAuth.logout();
          }}
        />

        <main className="flex-1 px-8 py-4 max-w-7xl w-full mx-auto pb-16 flex flex-col justify-between">
          <div>
            {currentTab === 'dashboard' && (
              <DashboardView
                patient={patient}
                medicines={medicines}
                events={events}
                todayEvents={todayEvents}
                metrics={metrics}
                alerts={alerts}
                onNavigate={(tab) => setCurrentTab(tab)}
                onRecordDose={handleRecordDose}
                onOpenVerification={handleOpenVerification}
                greetingText={greetingText}
                settings={settings}
                currentTime={currentTime}
              />
            )}

            {currentTab === 'medicines' && (
              <MedicinesView
                medicines={medicines}
                onAddMedicine={() => {
                  setEditingMedicine(null);
                  setIsMedModalOpen(true);
                }}
                onEditMedicine={(med) => {
                  setEditingMedicine(med);
                  setIsMedModalOpen(true);
                }}
                onDeleteMedicine={handleDeleteMedicine}
                onToggleActive={handleToggleMedicineActive}
              />
            )}

            {currentTab === 'schedule' && (
              <ScheduleView
                events={events}
                medicines={medicines}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onRecordDose={handleRecordDose}
                onOpenVerification={handleOpenVerification}
              />
            )}

            {currentTab === 'reminders' && (
              <ReminderCenterView
                events={events}
                medicines={medicines}
                settings={settings}
                onRecordDose={handleRecordDose}
                onOpenVerification={handleOpenVerification}
              />
            )}

            {currentTab === 'verification' && (
              <VerificationView
                events={events}
                medicines={medicines}
                activeEvent={activeVerificationEvent}
                onVerifyDose={handleVerifyDose}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView
                metrics={metrics}
                events={events}
                medicines={medicines}
              />
            )}

            {currentTab === 'airisk' && (
              <AiRiskView
                metrics={metrics}
                medicines={medicines}
                patient={patient}
              />
            )}

            {currentTab === 'history' && (
              <HistoryView
                events={events}
                medicines={medicines}
              />
            )}

            {currentTab === 'messages' && <PatientMessagesPage />}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                patient={patient}
                onUpdateSettings={async (s) => {
                  await updateSettings(s);
                  await loadAllData();
                }}
                onUpdatePatient={async (p) => {
                  await updatePatient(p);
                  await loadAllData();
                }}
                onLoadDemoData={handleLoadDemoData}
                onResetDatabase={handleResetDatabase}
                authUser={firebaseAuth.currentUser}
                onSendPasswordReset={async () => { if (firebaseAuth.currentUser?.email) await firebaseAuth.sendResetEmail(firebaseAuth.currentUser.email); }}
                caregiverAccess={caregiverAccess}
                onRevokeCaregiver={async (id) => { await revokeCaregiverLink(id); setCaregiverAccess(await fetchCaregiverAccess()); }}
                onGenerateCaretakerCode={generateCaretakerAccessCode}
                onLoadCurrentCaretakerCode={loadCurrentCaretakerCode}
                onDecideCaretakerRequest={async (id, decision) => { await decideCaretakerAccessRequest(id, decision); setCaregiverAccess(await fetchCaregiverAccess()); }}
                onLogout={async () => {
                  clearPatientState();
                  window.sessionStorage.removeItem('mediguard_session');
                  setAuthSession(null);
                  if (firebaseAuth.currentUser) await firebaseAuth.logout();
                }}
              />
            )}

          </div>

          {/* Bento Grid Application Footer */}
          <footer className="mt-12 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center text-[11px] text-[#64748B] gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20C997]"></span>
              <span>MediGuard AI is a clinical medication adherence prototype. Always verify with attending physicians.</span>
            </div>
            <span className="text-[10px]">Please verify medication decisions with your healthcare professional.</span>
          </footer>
        </main>
      </div>

      {/* Prescription Add/Edit Modal */}
      <MedicineModal
        isOpen={isMedModalOpen}
        onClose={() => {
          setIsMedModalOpen(false);
          setEditingMedicine(null);
        }}
        onSave={handleSaveMedicine}
        initialData={editingMedicine}
        patientId={patient?.id || 'pat-1'}
      />

      {/* Gemini AI Clinical Coach Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        patient={patient}
        medicines={medicines}
        metrics={metrics}
      />
    </div>
  );
}

export default App;
