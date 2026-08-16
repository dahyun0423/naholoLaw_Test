import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Writer } from '../components/ComplaintWizard.jsx'
import { emptyComplaint, findType } from '../lib/complaint.js'

const amounts = {
  loan: '12000000',
  wage: '5600000',
  tort: '18600000',
  evict: '30000000',
}

const baseForm = (typeKey) => ({
  ...emptyComplaint,
  court: '서울중앙지방법원',
  claimKind: '재산권상 청구',
  sueValueKind: typeKey === 'evict' ? '토지 등의 평가액' : '금액',
  amount: amounts[typeKey] || '10000000',
  pName: '김지민',
  pRrn: '900101-2345678',
  pAddr: '서울특별시 강남구 테헤란로 123',
  pAddrDetail: '101동 1001호',
  pTel: '010-1234-5678',
  dName: '박민수',
  dAddr: '서울특별시 서초구 서초대로 45',
  dAddrDetail: '302호',
})

export default function FigmaComplaintInput() {
  const { typeKey = 'loan', stepIndex = '3' } = useParams()
  const type = findType(typeKey)
  const initialStep = Math.max(0, Math.min(5, Number(stepIndex) - 1 || 0))
  const initialForm = useMemo(() => baseForm(typeKey), [typeKey])
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    setForm(initialForm)
    const previousTitle = document.title
    document.title = type ? `소장 입력 · ${type.title} · ${initialStep + 1}단계` : '소장 입력'
    return () => { document.title = previousTitle }
  }, [initialForm, initialStep, type])

  if (!type) {
    return <main className="grid min-h-screen place-items-center bg-ink-50 text-ink-600">캡처할 소장 유형을 찾지 못했습니다.</main>
  }

  return (
    <Writer
      key={`${typeKey}-${initialStep}`}
      typeKey={typeKey}
      form={form}
      setForm={setForm}
      initialStep={initialStep}
      captureMode
      deferCaseLink
      onBack={() => {}}
      onDone={() => {}}
    />
  )
}
