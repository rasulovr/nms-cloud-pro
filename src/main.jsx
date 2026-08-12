import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft, Building2, CheckCircle2, KeyRound, LockKeyhole,
  LogOut, RefreshCw, ShieldCheck, Smartphone, Users,
} from 'lucide-react';
import './saas-admin.css';

const url = import.meta.env.VITE_SAAS_SUPABASE_URL;
const key = import.meta.env.VITE_SAAS_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

function Message({ type = 'success', children }) {
  return <div className={'message ' + type}><CheckCircle2 size={16}/>{children}</div>;
}

function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = React.useState('sign-in');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const reset = () => { setError(''); setNotice(''); };
  const redirectTo = window.location.origin + '/';

  async function submit(event) {
    event.preventDefault();
    reset();
    if (!supabase) return setError('Staging-переменные окружения не настроены.');
    if (mode === 'sign-up' && password !== confirm) return setError('Пароли не совпадают.');
    if (mode !== 'reset' && password.length < 12) return setError('Используйте пароль длиной не менее 12 символов.');
    setBusy(true);
    let result;
    if (mode === 'sign-in') result = await supabase.auth.signInWithPassword({ email, password });
    if (mode === 'sign-up') result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    if (mode === 'reset') result = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (result?.error) return setError(result.error.message);
    if (mode === 'sign-in') return onSignedIn();
    setNotice(mode === 'sign-up'
      ? 'Проверьте почту и подтвердите адрес. После подтверждения войдите в staging.'
      : 'Если адрес зарегистрирован, ссылка для установки нового пароля отправлена на почту.');
  }

  return <main className="login"><section className="login-card">
    <div className="brand-mark">RMS <span>PRO</span></div>
    <p className="eyebrow">SAAS CONTROL CENTER · STAGING</p>
    <h1>{mode === 'sign-in' ? 'Вход в staging' : mode === 'sign-up' ? 'Создать тестовый доступ' : 'Восстановление пароля'}</h1>
    <p className="muted">Отдельный контур разработки RMS SaaS. Он не связан с production RMS.</p>
    <div className="auth-tabs">
      <button className={mode === 'sign-in' ? 'active' : ''} onClick={() => { setMode('sign-in'); reset(); }}>Войти</button>
      <button className={mode === 'sign-up' ? 'active' : ''} onClick={() => { setMode('sign-up'); reset(); }}>Регистрация</button>
    </div>
    <form onSubmit={submit}>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/></label>
      {mode !== 'reset' && <label>Пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength="12" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}/></label>}
      {mode === 'sign-up' && <label>Повторите пароль<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength="12" autoComplete="new-password"/></label>}
      {error && <Message type="error">{error}</Message>}
      {notice && <Message>{notice}</Message>}
      <button className="primary" disabled={busy}>{busy ? 'Подождите…' : mode === 'sign-in' ? 'Войти' : mode === 'sign-up' ? 'Отправить подтверждение' : 'Отправить ссылку'}</button>
    </form>
    {mode === 'sign-in' && <button className="text-button" onClick={() => { setMode('reset'); reset(); }}><KeyRound size={15}/>Забыли пароль?</button>}
    {mode === 'reset' && <button className="text-button" onClick={() => { setMode('sign-in'); reset(); }}><ArrowLeft size={15}/>Вернуться ко входу</button>}
    <div className="secure-note"><LockKeyhole size={16}/> Доступ контролируют Supabase Auth, MFA и RLS</div>
  </section></main>;
}

function RecoveryScreen({ onComplete }) {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  async function update(event) {
    event.preventDefault();
    setError('');
    if (password.length < 12) return setError('Используйте пароль длиной не менее 12 символов.');
    if (password !== confirm) return setError('Пароли не совпадают.');
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(updateError.message);
    onComplete();
  }
  return <main className="login"><section className="login-card">
    <div className="brand-mark">RMS <span>PRO</span></div><p className="eyebrow">STAGING · PASSWORD RECOVERY</p><h1>Новый пароль</h1>
    <form onSubmit={update}><label>Новый пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="12" required autoComplete="new-password"/></label><label>Повторите пароль<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength="12" required autoComplete="new-password"/></label>{error && <Message type="error">{error}</Message>}<button className="primary" disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить пароль'}</button></form>
  </section></main>;
}

function MfaGate({ onVerified }) {
  const [stage, setStage] = React.useState('loading');
  const [factorId, setFactorId] = React.useState('');
  const [enrollment, setEnrollment] = React.useState(null);
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const inspect = React.useCallback(async () => {
    setError('');
    const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) { setError(factorsError.message); setStage('error'); return; }
    const verified = data?.totp?.find(factor => factor.status === 'verified');
    if (verified) { setFactorId(verified.id); setStage('challenge'); return; }
    setStage('enroll-ready');
  }, []);

  React.useEffect(() => { inspect(); }, [inspect]);

  async function startEnrollment() {
    setBusy(true); setError('');
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const stale = (factors?.all || []).filter(factor => factor.factor_type === 'totp' && factor.status !== 'verified');
    for (const factor of stale) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'RMS Pro SaaS Staging',
    });
    setBusy(false);
    if (enrollError) return setError(enrollError.message);
    setEnrollment(data); setFactorId(data.id); setStage('enroll');
  }

  async function verify(event) {
    event.preventDefault();
    const cleanCode = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanCode)) return setError('Введите 6-значный код из приложения-аутентификатора.');
    setBusy(true); setError('');
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { setBusy(false); return setError(challengeError.message); }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: cleanCode });
    setBusy(false);
    if (verifyError) return setError(verifyError.message);
    await supabase.auth.refreshSession();
    onVerified();
  }

  return <section className="dashboard">
    <header><div><p className="eyebrow">RMS SUPER ADMIN · MFA REQUIRED</p><h1>Защитите доступ</h1><p>Для доступа к каталогу организаций требуется второй фактор.</p></div></header>
    <div className="card mfa-card">
      <Smartphone size={28}/>
      <h2>{stage === 'challenge' ? 'Подтвердите вход' : 'Подключите приложение-аутентификатор'}</h2>
      {stage === 'loading' && <p className="muted">Проверяю состояние MFA…</p>}
      {stage === 'enroll-ready' && <>
        <p className="muted">Подойдут Google Authenticator, Microsoft Authenticator, 1Password или другое TOTP-приложение.</p>
        <button className="primary" disabled={busy} onClick={startEnrollment}>{busy ? 'Подготавливаю…' : 'Показать QR-код'}</button>
      </>}
      {stage === 'enroll' && enrollment?.totp && <>
        <div className="mfa-qr">
          <img src={enrollment.totp.qr_code} alt="QR-код для подключения MFA"/>
          <div><ol className="steps"><li>Откройте приложение-аутентификатор.</li><li>Добавьте новый аккаунт и отсканируйте QR-код.</li><li>Введите появившийся 6-значный код ниже.</li></ol><span className="secret">{enrollment.totp.secret}</span></div>
        </div>
      </>}
      {(stage === 'enroll' || stage === 'challenge') && <form className="mfa-form" onSubmit={verify}>
        <label>Код подтверждения<input inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required/></label>
        <div className="mfa-actions"><button className="primary" disabled={busy}>{busy ? 'Проверяю…' : 'Подтвердить MFA'}</button>{stage === 'challenge' && <button className="secondary" type="button" onClick={inspect}>Обновить</button>}</div>
      </form>}
      {error && <Message type="error">{error}</Message>}
      <div className="secure-note"><ShieldCheck size={16}/> Без AAL2 финансовые данные и каталог организаций остаются закрыты.</div>
    </div>
  </section>;
}

function Stat({ label, value }) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }

function SuperAdminDashboard({ rows, loading, onRefresh, email }) {
  const totals = rows.reduce((sum, row) => ({
    branches: sum.branches + Number(row.active_branch_count || 0),
    members: sum.members + Number(row.active_member_count || 0),
    modules: sum.modules + Number(row.enabled_module_count || 0),
    support: sum.support + Number(row.pending_support_request_count || 0),
  }), { branches: 0, members: 0, modules: 0, support: 0 });
  return <section className="dashboard">
    <header><div><p className="eyebrow">RMS SUPER ADMIN · MFA VERIFIED</p><h1>Организации</h1><p>Только нефинансовый каталог и агрегированные показатели.</p></div><button className="icon-btn" onClick={onRefresh} disabled={loading}><RefreshCw size={18}/></button></header>
    <Message><ShieldCheck size={16}/>Доступ предоставлен через защищённый RPC и MFA уровня AAL2.</Message>
    <div className="stats"><Stat label="Организации" value={rows.length}/><Stat label="Активные филиалы" value={totals.branches}/><Stat label="Активные сотрудники" value={totals.members}/><Stat label="Ожидают поддержку" value={totals.support}/></div>
    <div className="card table-wrap"><table><thead><tr><th>Организация</th><th>Статус</th><th>Филиалы</th><th>Сотрудники</th><th>Модули</th><th>Поддержка</th><th>Обновлено</th></tr></thead><tbody>{rows.length ? rows.map(row => <tr key={row.organization_id}><td><strong>{row.organization_name}</strong><small>{row.organization_slug}</small></td><td><span className={'badge ' + row.organization_status}>{row.organization_status}</span></td><td>{row.active_branch_count}</td><td>{row.active_member_count}</td><td>{row.enabled_module_count}</td><td>{row.pending_support_request_count}</td><td>{new Date(row.updated_at).toLocaleString('ru-RU')}</td></tr>) : <tr><td colSpan="7" className="empty-row">Организаций в staging пока нет.</td></tr>}</tbody></table></div>
    <p className="footer-note">Вход: {email}</p>
  </section>;
}

function MemberDashboard({ organizations, email }) {
  return <section className="dashboard"><header><div><p className="eyebrow">RMS CLOUD · STAGING</p><h1>Ваши организации</h1><p>Доступ определяется ролью и политиками RLS.</p></div></header>{organizations.length ? <div className="org-grid">{organizations.map(org => <article className="card" key={org.id}><Building2 size={22}/><h2>{org.name}</h2><p>{org.slug}</p><span className={'badge ' + org.status}>{org.status}</span></article>)}</div> : <div className="empty"><Users size={40}/><h2>Доступ пока не назначен</h2><p>Администратор организации назначит роль и филиалы.</p><p className="footer-note">Вход: {email}</p></div>}</section>;
}

function App() {
  const [session, setSession] = React.useState(null);
  const [recovery, setRecovery] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [needsMfa, setNeedsMfa] = React.useState(false);
  const [adminRows, setAdminRows] = React.useState([]);
  const [organizations, setOrganizations] = React.useState([]);

  const load = React.useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: { session: current } } = await supabase.auth.getSession();
    setSession(current);
    if (!current) { setIsSuperAdmin(false); setNeedsMfa(false); setLoading(false); return; }

    const { data: access, error: accessError } = await supabase.rpc('rms_super_admin_access_state');
    if (!accessError && access === true) {
      setIsSuperAdmin(true); setOrganizations([]);
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || aal?.currentLevel !== 'aal2') {
        setNeedsMfa(true); setAdminRows([]); setLoading(false); return;
      }
      setNeedsMfa(false);
      const { data: dashboard, error: dashboardError } = await supabase.rpc('rms_super_admin_dashboard_organizations');
      if (!dashboardError) setAdminRows(dashboard || []);
      setLoading(false); return;
    }

    setIsSuperAdmin(false); setNeedsMfa(false); setAdminRows([]);
    const { data } = await supabase.from('organizations').select('id,name,slug,status').order('name');
    setOrganizations(data || []); setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') { setIsSuperAdmin(false); setNeedsMfa(false); setAdminRows([]); setOrganizations([]); }
    });
    return () => subscription.unsubscribe();
  }, [load]);

  if (!url || !key) return <main className="login"><section className="login-card"><div className="brand-mark">RMS <span>PRO</span></div><h1>Панель не настроена</h1><Message type="error">Задайте staging URL и publishable key.</Message></section></main>;
  if (loading && !session) return <div className="splash">RMS PRO</div>;
  if (recovery) return <RecoveryScreen onComplete={() => { setRecovery(false); load(); }}/>;
  if (!session) return <AuthScreen onSignedIn={load}/>;
  return <div className="shell"><aside><div className="logo">RMS <b>PRO</b><small>SAAS STAGING</small></div><div className="aside-foot"><span>{session.user.email}</span><button onClick={() => supabase.auth.signOut()}><LogOut size={17}/>Выйти</button></div></aside><main className="content">{isSuperAdmin && needsMfa ? <MfaGate onVerified={load}/> : isSuperAdmin ? <SuperAdminDashboard rows={adminRows} loading={loading} onRefresh={load} email={session.user.email}/> : <MemberDashboard organizations={organizations} email={session.user.email}/>}</main></div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
