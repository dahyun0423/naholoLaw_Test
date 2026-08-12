export const MB = 1024 * 1024
export const GB = 1024 * MB

export const STORAGE_PLANS = Object.freeze({
  free: {
    id: 'free',
    name: '기본',
    totalBytes: 500 * MB,
    price: 0,
    description: '증빙자료를 시작하기 위한 기본 저장공간',
  },
  storage10: {
    id: 'storage10',
    name: '안심 보관 10GB',
    totalBytes: 10 * GB,
    price: 12900,
    description: '진행 중인 사건의 증빙을 비공개로 모아 관리하는 개인 사용자용',
  },
  storage50: {
    id: 'storage50',
    name: '전문 보관 50GB',
    totalBytes: 50 * GB,
    price: 24900,
    description: '여러 사건과 대용량 증빙을 장기간 관리하는 사용자용',
  },
})

export const PAID_STORAGE_PLANS = [STORAGE_PLANS.storage10, STORAGE_PLANS.storage50]

export const storagePlan = (id) => STORAGE_PLANS[id] || STORAGE_PLANS.free

export function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  if (bytes >= GB) {
    const value = bytes / GB
    return `${value >= 10 || Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} GB`
  }
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  const value = bytes / MB
  return `${value >= 10 || Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} MB`
}

export const formatWon = (amount) => `${new Intl.NumberFormat('ko-KR').format(amount)}원`
