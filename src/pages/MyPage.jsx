import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useStorageSubscription } from '../hooks/useStorageSubscription.js'
import { usePrecedentSubscription } from '../hooks/usePrecedentSubscription.js'
import { caseDocs, caseEvidence, caseTitle, caseUpcoming } from '../lib/casebook.js'
import { formatBytes } from '../lib/storagePlans.js'
import { Card, Badge, Button, inputCls } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import LegalDocModal from '../components/LegalDocModal.jsx'
import StoragePlanModal from '../components/StoragePlanModal.jsx'
import PrecedentPlanModal from '../components/PrecedentPlanModal.jsx'
import { FileText, Folder, Calendar, LogOut, ChevronRight, Shield } from '../components/icons.jsx'

const fieldLabel = 'mb-1.5 block text-sm font-medium text-ink-700'
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2'

export default function MyPage() {
  const { user, logout, setProfile, changePassword } = useAuth()
  const { rawCases } = useWorkspace()
  const navigate = useNavigate()
  const toast = useToast()
  const billing = useStorageSubscription()
  const precedentBilling = usePrecedentSubscription()
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', username: user?.username || '' })
  const [profileError, setProfileError] = useState('')
  const [securityOpen, setSecurityOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [storageOpen, setStorageOpen] = useState(false)
  const [precedentOpen, setPrecedentOpen] = useState(false)
  const [doc, setDoc] = useState(null)

  useEffect(() => {
    if (!billing.notice) return
    toast(billing.notice, 'success')
    billing.clearNotice()
  }, [billing.notice, billing, toast])

  useEffect(() => {
    if (!precedentBilling.notice) return
    toast(precedentBilling.notice, 'success')
    precedentBilling.clearNotice()
  }, [precedentBilling.notice, toast])

  const totals = useMemo(() => rawCases.reduce((sum, c) => ({
    docs: sum.docs + caseDocs(c).length,
    evidence: sum.evidence + caseEvidence(c).length,
    schedule: sum.schedule + caseUpcoming(c).filter((item) => item.dday >= 0).length,
  }), { docs: 0, evidence: 0, schedule: 0 }), [rawCases])

  const summary = [
    { icon: FileText, label: '생성한 문서', value: `${totals.docs}건`, to: '/app/documents' },
    { icon: Folder, label: '등록한 증거', value: `${totals.evidence}건`, to: '/app/evidence' },
    { icon: Calendar, label: '다가오는 일정', value: `${totals.schedule}건`, to: '/app/schedule' },
  ]

  const startEdit = () => {
    setForm({ name: user?.name || '', email: user?.email || '', username: user?.username || '' })
    setProfileError('')
    setEdit(true)
  }

  const saveProfile = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim()
    const username = form.username.trim()
    if (!name) {
      setProfileError('이름을 입력해주세요.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setProfileError('올바른 이메일 주소를 입력해주세요.')
      return
    }
    if (username.length < 4 || !/^[A-Za-z0-9_]+$/.test(username)) {
      setProfileError('아이디는 영문·숫자·밑줄을 사용해 4자 이상 입력해주세요.')
      return
    }
    setProfile?.({ name, email, username })
    setEdit(false)
    setProfileError('')
    toast('프로필을 저장했습니다', 'success')
  }

  const openSecurity = () => {
    setPasswordForm({ current: '', next: '', confirm: '' })
    setPasswordError('')
    setSecurityOpen(true)
  }

  const savePassword = async (event) => {
    event.preventDefault()
    if (!passwordForm.current) {
      setPasswordError('현재 비밀번호를 입력해주세요.')
      return
    }
    if (passwordForm.next.length < 6) {
      setPasswordError('새 비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (passwordForm.current === passwordForm.next) {
      setPasswordError('현재 비밀번호와 다른 비밀번호를 입력해주세요.')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('새 비밀번호가 서로 일치하지 않습니다.')
      return
    }

    setPasswordBusy(true)
    const result = await changePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.next })
    setPasswordBusy(false)
    if (!result.ok) {
      setPasswordError(result.error)
      return
    }
    setSecurityOpen(false)
    setPasswordForm({ current: '', next: '', confirm: '' })
    toast('비밀번호를 변경했습니다', 'success')
  }

  const settings = [
    { t: '알림 확인 및 설정', desc: '기일·제출 기한 알림을 관리해요', to: '/app/notifications' },
    { t: '비밀번호 및 보안', desc: '비밀번호를 변경하고 계정을 보호해요', onClick: openSecurity },
    { t: '서비스 이용약관', desc: '서비스 이용 조건을 확인해요', onClick: () => setDoc('terms') },
    { t: '개인정보처리방침', desc: '수집·보관되는 정보를 확인해요', onClick: () => setDoc('privacy') },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">마이페이지</h1>
        <p className="mt-1 text-sm text-ink-500">내 사건 현황과 계정·저장공간 설정을 관리하세요.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-500" aria-hidden="true">
              {user?.name?.[0] || '나'}
            </span>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <h2 className="text-lg font-bold text-ink-900">{user?.name || '사용자'}</h2>
              {user?.username && <Badge tone="blue">@{user.username}</Badge>}
            </div>
            <p className="text-sm text-ink-500">{user?.email}</p>
          </div>

          {!edit ? (
            <Button variant="neutral" className="mt-6 w-full" onClick={startEdit}>프로필 수정</Button>
          ) : (
            <form className="mt-6 space-y-3" onSubmit={saveProfile} noValidate>
              <label>
                <span className={fieldLabel}>이름</span>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoComplete="name"
                />
              </label>
              <label>
                <span className={fieldLabel}>이메일</span>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </label>
              <label>
                <span className={fieldLabel}>아이디</span>
                <input
                  className={inputCls}
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                />
              </label>
              {profileError && <p role="alert" className="text-xs font-medium text-red-500">{profileError}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="neutral" className="flex-1" onClick={() => { setEdit(false); setProfileError('') }}>취소</Button>
                <Button type="submit" className="flex-1">저장</Button>
              </div>
            </form>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-ink-100 pt-5">
            {summary.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className={`rounded-xl px-1 py-2 text-center transition-colors hover:bg-brand-50 ${focusRing}`}
                aria-label={`${s.label} ${s.value} 보기`}
              >
                <s.icon size={18} className="mx-auto text-brand-400" />
                <div className="mt-1.5 text-lg font-bold text-ink-900">{s.value}</div>
                <div className="text-[11px] text-ink-500">{s.label}</div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink-900">내 사건</h3>
                <p className="mt-0.5 text-xs text-ink-500">최근 수정한 사건부터 보여드려요.</p>
              </div>
              <Button as={Link} to="/app/cases" size="sm" variant="ghost">전체보기 <ChevronRight size={15} /></Button>
            </div>
            {rawCases.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {rawCases.slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/app/cases/${c.id}`}
                      className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-ink-100 p-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 ${focusRing}`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-ink-800">{caseTitle(c)}</span>
                          <Badge tone={c.status === '종결' ? 'gray' : 'blue'}>{c.status}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-500">
                          {[c.caseNo || '사건번호 없음', c.form?.court || '법원 미정'].join(' · ')}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-500">
                        사건 열기 <ChevronRight size={16} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-5 py-8 text-center">
                <p className="text-sm font-semibold text-ink-800">아직 등록한 사건이 없어요.</p>
                <p className="mt-1 text-xs text-ink-500">사건을 만들면 문서·증거·일정이 한곳에 모입니다.</p>
                <Button as={Link} to="/app/cases" size="sm" className="mt-4">첫 사건 만들기</Button>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-ink-900">구독 관리</h3>
            <p className="mt-1 text-xs text-ink-500">저장공간과 판례검색 이용권은 서로 별도로 결제·해지됩니다.</p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-800">증빙자료 저장공간</p>
                  <Badge tone="blue">{billing.checking ? '확인 중' : billing.subscription.planName}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-500">현재 {formatBytes(billing.subscription.totalBytes)}까지 보관</p>
              </div>
              <Button variant="neutral" size="sm" onClick={() => setStorageOpen(true)}>
                {billing.subscription.planId === 'free' ? '저장공간 늘리기' : '저장공간 구독 관리'}
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-800">판례검색 이용권</p>
                  <Badge tone={precedentBilling.subscription.planId === 'premium' ? 'blue' : 'gray'}>
                    {precedentBilling.checking ? '확인 중' : precedentBilling.subscription.planName}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {precedentBilling.subscription.planId === 'premium' ? '내 사건 유사판례 전체 결과 확인' : '검색당 유사 판례 최대 5건 확인'}
                </p>
              </div>
              <Button variant="neutral" size="sm" onClick={() => setPrecedentOpen(true)}>
                {precedentBilling.subscription.planId === 'premium' ? '판례검색 구독 관리' : '프리미엄 보기'}
              </Button>
            </div>

            {billing.error && <p role="alert" className="mt-3 text-xs font-medium text-red-500">저장공간 구독 확인 실패: {billing.error}</p>}
            {precedentBilling.error && <p role="alert" className="mt-2 text-xs font-medium text-red-500">판례검색 구독 확인 실패: {precedentBilling.error}</p>}
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-ink-900">계정 설정</h3>
            <div className="mt-3 divide-y divide-ink-100">
              {settings.map((s) => {
                const body = (
                  <>
                    <span>
                      <span className="block text-sm font-medium text-ink-700">{s.t}</span>
                      <span className="mt-0.5 block text-xs text-ink-400">{s.desc}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-ink-300" />
                  </>
                )
                return s.to ? (
                  <Link key={s.t} to={s.to} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-ink-50 ${focusRing}`}>
                    {body}
                  </Link>
                ) : (
                  <button key={s.t} type="button" onClick={s.onClick} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-ink-50 ${focusRing}`}>
                    {body}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="flex items-start gap-3 border-brand-100 bg-brand-50/40 p-5">
            <Shield size={20} className="mt-0.5 shrink-0 text-brand-400" />
            <p className="text-xs leading-relaxed text-ink-600">
              본 서비스가 제공하는 정보와 생성 문서는 법률 자문이 아니며 참고용입니다. 최종 판단과 책임은 이용자 본인에게 있습니다.
            </p>
          </Card>

          <Button variant="neutral" className="w-full text-red-500 hover:bg-red-50" onClick={() => { logout(); navigate('/') }}>
            <LogOut size={16} /> 로그아웃
          </Button>
        </div>
      </div>

      <Modal
        open={securityOpen}
        onClose={() => { if (!passwordBusy) setSecurityOpen(false) }}
        title="비밀번호 및 보안"
        footer={(
          <>
            <Button type="button" variant="neutral" disabled={passwordBusy} onClick={() => setSecurityOpen(false)}>취소</Button>
            <Button type="submit" form="password-change-form" disabled={passwordBusy}>
              {passwordBusy ? '변경 중…' : '비밀번호 변경'}
            </Button>
          </>
        )}
      >
        <form id="password-change-form" className="space-y-4" onSubmit={savePassword}>
          <p className="text-[13px] leading-relaxed text-ink-500">현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.</p>
          <label>
            <span className={fieldLabel}>현재 비밀번호</span>
            <input
              type="password"
              className={inputCls}
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((formValue) => ({ ...formValue, current: e.target.value }))}
              autoComplete="current-password"
            />
          </label>
          <label>
            <span className={fieldLabel}>새 비밀번호</span>
            <input
              type="password"
              className={inputCls}
              value={passwordForm.next}
              onChange={(e) => setPasswordForm((formValue) => ({ ...formValue, next: e.target.value }))}
              autoComplete="new-password"
              placeholder="6자 이상 입력"
            />
          </label>
          <label>
            <span className={fieldLabel}>새 비밀번호 확인</span>
            <input
              type="password"
              className={inputCls}
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((formValue) => ({ ...formValue, confirm: e.target.value }))}
              autoComplete="new-password"
            />
          </label>
          {passwordError && <p role="alert" className="text-xs font-medium text-red-500">{passwordError}</p>}
        </form>
      </Modal>

      <StoragePlanModal
        open={storageOpen}
        onClose={() => setStorageOpen(false)}
        subscription={billing.subscription}
        checking={billing.checking}
        busyPlan={billing.busyPlan}
        error={billing.error}
        onSubscribe={(planId) => billing.startCheckout(planId, user?.email)}
        onManage={billing.openPortal}
      />

      <PrecedentPlanModal
        open={precedentOpen}
        onClose={() => setPrecedentOpen(false)}
        subscription={precedentBilling.subscription}
        checking={precedentBilling.checking}
        busyPlan={precedentBilling.busyPlan}
        error={precedentBilling.error}
        onSubscribe={() => precedentBilling.startCheckout(user?.email)}
        onManage={precedentBilling.openPortal}
      />

      <LegalDocModal docKey={doc} onClose={() => setDoc(null)} />
    </div>
  )
}
