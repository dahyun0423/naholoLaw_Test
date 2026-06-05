import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { Card, Badge, Button, inputCls, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { User, FileText, Folder, Calendar, LogOut, ChevronRight, Shield } from '../components/icons.jsx'

const myCases = [
  { id: '2024가단123456', title: '임대차 보증금 반환 청구', status: '진행 중', tone: 'blue', court: '서울중앙지방법원' },
  { id: '2024가단998877', title: '근로계약 위반 손해배상', status: '준비 중', tone: 'amber', court: '서울남부지방법원' },
]
const summary = [
  { icon: FileText, label: '생성한 문서', value: '7건' },
  { icon: Folder, label: '등록한 증거', value: '14건' },
  { icon: Calendar, label: '등록한 일정', value: '9건' },
]

export default function MyPage() {
  const { user, logout, setProfile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [pw, setPw] = useState(false)
  const [doc, setDoc] = useState(null)

  const saveProfile = () => {
    setProfile?.({ name: form.name, email: form.email })
    setEdit(false)
    toast('프로필이 저장되었습니다', 'success')
  }
  const settings = [
    { t: '비밀번호 변경', onClick: () => setPw(true) },
    { t: '알림 설정', onClick: () => navigate('/app/notifications') },
    { t: '서비스 이용약관', onClick: () => setDoc('terms') },
    { t: '개인정보처리방침', onClick: () => setDoc('privacy') },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">마이페이지</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* profile */}
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-500">{user?.name?.[0] || '나'}</span>
            <h2 className="mt-4 text-lg font-bold text-ink-900">{user?.name}</h2>
            <p className="text-sm text-ink-500">{user?.email}</p>
            <Badge tone="blue" className="mt-2">@{user?.username}</Badge>
          </div>

          {!edit ? (
            <Button variant="neutral" className="mt-6 w-full" onClick={() => setEdit(true)}>프로필 수정</Button>
          ) : (
            <div className="mt-6 space-y-3">
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="이름" />
              <input className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="이메일" />
              <div className="flex gap-2">
                <Button variant="neutral" className="flex-1" onClick={() => setEdit(false)}>취소</Button>
                <Button className="flex-1" onClick={saveProfile}>저장</Button>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-ink-100 pt-5">
            {summary.map((s) => (
              <div key={s.label} className="text-center">
                <s.icon size={18} className="mx-auto text-brand-400" />
                <div className="mt-1.5 text-lg font-bold text-ink-900">{s.value}</div>
                <div className="text-[11px] text-ink-400">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* right */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-bold text-ink-900">내 사건</h3>
            <div className="mt-4 space-y-3">
              {myCases.map((c) => (
                <button key={c.id} onClick={() => { toast(`${c.title} 사건으로 이동합니다`); navigate('/app/procedure') }} className="flex w-full items-center justify-between rounded-xl border border-ink-100 p-4 text-left hover:bg-ink-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-800">{c.title}</span>
                      <Badge tone={c.tone}>{c.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-400">{c.id} · {c.court}</p>
                  </div>
                  <ChevronRight size={18} className="text-ink-300" />
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-ink-900">계정 설정</h3>
            <div className="mt-3 divide-y divide-ink-100">
              {settings.map((s) => (
                <button key={s.t} onClick={s.onClick} className="flex w-full items-center justify-between py-3.5 text-left text-sm text-ink-700 hover:text-brand-400">
                  {s.t} <ChevronRight size={16} className="text-ink-300" />
                </button>
              ))}
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

      {/* 비밀번호 변경 모달 */}
      <Modal open={pw} onClose={() => setPw(false)} title="비밀번호 변경"
        footer={<><Button variant="neutral" onClick={() => setPw(false)}>취소</Button><Button onClick={() => { setPw(false); toast('비밀번호가 변경되었습니다', 'success') }}>변경하기</Button></>}>
        <div className="space-y-3">
          <input type="password" className={inputCls} placeholder="현재 비밀번호" />
          <input type="password" className={inputCls} placeholder="새 비밀번호 (6자 이상)" />
          <input type="password" className={inputCls} placeholder="새 비밀번호 확인" />
        </div>
      </Modal>

      {/* 약관/개인정보 모달 */}
      <Modal open={!!doc} onClose={() => setDoc(null)} maxW="max-w-2xl"
        title={doc === 'terms' ? '서비스 이용약관' : '개인정보처리방침'}
        footer={<Button onClick={() => setDoc(null)}>확인</Button>}>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto text-[13px] leading-relaxed text-ink-600">
          {doc === 'terms' ? (
            <>
              <p><b className="text-ink-800">제1조 (목적)</b> 본 약관은 나홀로법에(이하 “서비스”)가 제공하는 AI 기반 나홀로 소송 지원 서비스의 이용 조건 및 절차를 규정함을 목적으로 합니다.</p>
              <p><b className="text-ink-800">제2조 (서비스의 성격)</b> 본 서비스가 제공하는 모든 정보와 생성 문서는 법률 자문이 아니며, 사용자의 문서 작성을 보조하는 도구로서 기능합니다. 최종적인 법적 판단과 책임은 이용자 본인에게 있습니다.</p>
              <p><b className="text-ink-800">제3조 (면책)</b> 서비스는 AI 특성상 일부 부정확한 내용이 포함될 수 있으며, 이에 따른 결과에 대해 책임지지 않습니다. 복잡한 사안은 법률 전문가와 상담하시기 바랍니다.</p>
            </>
          ) : (
            <>
              <p><b className="text-ink-800">1. 수집 항목</b> 이름, 이메일, 아이디, 사용자가 업로드한 소송 관련 문서 및 증거 자료.</p>
              <p><b className="text-ink-800">2. 이용 목적</b> 소송 준비 지원(문서 생성, 판례 분석, 일정 관리) 제공 목적에 한해 사용합니다.</p>
              <p><b className="text-ink-800">3. 보관 및 보호</b> 업로드된 자료는 암호화되어 보관되며, 증거에 포함된 제3자 개인정보는 자동 탐지하여 마스킹을 안내합니다.</p>
              <p><b className="text-ink-800">4. 파기</b> 회원 탈퇴 또는 보관 목적 달성 시 지체 없이 파기합니다.</p>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
