// 증빙 서류함 — 폴더형 보기의 저장소
//
// 사건 자료의 "내용"은 사건(casebook)에 있다. 여기에 저장하는 것은 **정리 상태**다 —
// 어떤 폴더를 만들었고, 어느 파일을 어디에 넣었는지. 둘을 나눠 둔 이유는 분명하다.
//   · 소장에서 파일을 더 올리면 서류함에 자동으로 나타나야 하고,
//   · 서류함에서 폴더를 옮긴 것이 새로고침에 사라지면 안 되기 때문이다.
//
// 그래서 화면을 열 때마다 **저장된 정리 상태 + 지금 사건의 파일**을 합쳐 폴더 구조를 만든다.
// 사건에서 사라진 파일은 서류함에서도 빠지고, 아직 자리를 못 잡은 파일은 파일명으로
// 종류를 짐작해 들어간다.

import { evidenceKindOf, evidenceKindName } from './casebook.js'

const KEY = 'naholo_vault'

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

const write = (v) => {
  try { localStorage.setItem(KEY, JSON.stringify(v)); return true } catch { return false }
}

/** 사건 자료의 id — 번호가 아니라 파일명으로 잡는다. 앞 증거를 지우면 호증 번호는 당겨지니까. */
export const evId = (name) => `ev:${name}`
export const isCaseFile = (f) => typeof f?.id === 'string' && f.id.startsWith('ev:')

const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
export const newFileId = () => uid('f')
export const newFolderKey = () => uid('k')

const mergeFilledSeed = (seed, stored = {}) => {
  const merged = { ...seed, ...stored }
  Object.entries(seed).forEach(([key, value]) => {
    const current = merged[key]
    if (current === '' || current === null || current === undefined || (Array.isArray(current) && current.length === 0)) {
      merged[key] = value
    }
  })
  const storedVersions = Array.isArray(stored.versions) ? stored.versions : []
  merged.versions = (seed.versions || []).map((version, index) => ({
    ...version,
    ...(storedVersions[index] || {}),
  }))
  return merged
}

/* ─────────────────── 읽기 ─────────────────── */

/** 파일 하나를 폴더에 넣는다. 그 종류의 폴더가 없으면 만든다. */
function place(folders, file) {
  const kind = evidenceKindOf(file.name)
  let folder = folders.find((f) => f.key === kind)
  if (!folder) {
    folder = { key: kind, name: evidenceKindName(kind), tags: [], files: [] }
    folders.push(folder)
  }
  folder.files.push(file)
}

function buildCase(def, stored) {
  const live = new Map((def.caseFiles || []).map((f) => [f.id, f]))
  const seeded = new Map((def.seedFolders || []).flatMap((folder) => (
    (folder.files || []).map((file) => [file.id, file])
  )))
  let folders

  if (stored?.folders) {
    folders = stored.folders.map((f) => ({
      key: f.key,
      name: f.name,
      tags: f.tags || [],
      // 사건에서 사라진 자료는 서류함에서도 뺀다. 남은 것은 사건 쪽 값(이름·상태·용량)이 진짜다.
      files: (f.files || [])
        .filter((x) => !isCaseFile(x) || live.has(x.id))
        .map((x) => {
          if (live.has(x.id)) return { ...x, ...live.get(x.id) }
          if (seeded.has(x.id)) return mergeFilledSeed(seeded.get(x.id), x)
          return x
        }),
    }))
  } else {
    // 처음 여는 사건 — 예시 구조가 있으면 그것을, 없으면 종류별로 나눠 만든다
    folders = (def.seedFolders || []).map((f) => ({
      key: f.key, name: f.name, tags: f.tags || [], files: [...(f.files || [])],
    }))
  }

  const placed = new Set(folders.flatMap((f) => f.files.map((x) => x.id)))

  // 예시 폴더는 과거 로컬 저장 구조에 빠진 파일이 있어도 최신 기본값으로 다시 채운다.
  // 새로 추가한 상세 필드는 위의 seeded 병합으로 보강되고, 행 자체가 없으면 여기서 복구된다.
  for (const seedFolder of def.seedFolders || []) {
    let target = folders.find((folder) => folder.key === seedFolder.key)
    if (!target) {
      target = { key: seedFolder.key, name: seedFolder.name, tags: seedFolder.tags || [], files: [] }
      folders.push(target)
    }
    for (const file of seedFolder.files || []) {
      if (placed.has(file.id)) continue
      target.files.push({ ...file })
      placed.add(file.id)
    }
  }

  for (const f of def.caseFiles || []) {
    if (!placed.has(f.id)) place(folders, f)
  }

  const { seedFolders, caseFiles, ...rest } = def
  return { ...rest, folders }
}

/**
 * 화면이 쓸 폴더 구조를 만든다.
 * @param defs [{ key, caseNo, title, court, status, caseFiles?, seedFolders? }]
 */
export function buildTree(defs) {
  const store = read()
  return defs.map((d) => buildCase(d, store[d.key]))
}

/** 정리 상태를 저장한다. 화면을 바꾼 직후마다 부른다 — 저장 버튼이 따로 없는 게 맞다. */
export function persist(tree) {
  const store = read()
  for (const n of tree) {
    store[n.key] = { folders: n.folders.map(({ key, name, tags, files }) => ({ key, name, tags, files })) }
  }
  return write(store)
}

/* ─────────────────── 쓰기 (모두 새 트리를 돌려준다) ─────────────────── */

const mapCase = (tree, caseKey, fn) => tree.map((n) => (n.key === caseKey ? fn(n) : n))
const mapFolders = (tree, caseKey, fn) => mapCase(tree, caseKey, (n) => ({ ...n, folders: fn(n.folders) }))

export const findCase = (tree, caseKey) => tree.find((n) => n.key === caseKey) || null
export const findFolder = (node, folderKey) => node?.folders.find((f) => f.key === folderKey) || null

/** 이름이 같은 폴더가 이미 있으면 그것을 쓴다 — 같은 이름 폴더가 둘이면 자료가 갈린다 */
export function addFolder(tree, caseKey, name, tags = []) {
  const node = findCase(tree, caseKey)
  const exist = node?.folders.find((f) => f.name === name)
  if (exist) return { tree, key: exist.key, existed: true }
  const key = newFolderKey()
  return { tree: mapFolders(tree, caseKey, (fs) => [...fs, { key, name, tags, files: [] }]), key, existed: false }
}

export const renameFolder = (tree, caseKey, folderKey, name) =>
  mapFolders(tree, caseKey, (fs) => fs.map((f) => (f.key === folderKey ? { ...f, name } : f)))

export const setFolderTags = (tree, caseKey, folderKey, tags) =>
  mapFolders(tree, caseKey, (fs) => fs.map((f) => (f.key === folderKey ? { ...f, tags } : f)))

/** 폴더를 지운다. 안에 있던 파일은 버리지 않고 '기타 자료'로 옮긴다 — 지운 건 폴더지 자료가 아니다. */
export function removeFolder(tree, caseKey, folderKey) {
  return mapFolders(tree, caseKey, (fs) => {
    const target = fs.find((f) => f.key === folderKey)
    if (!target) return fs
    const rest = fs.filter((f) => f.key !== folderKey)
    if (target.files.length === 0) return rest
    const etc = rest.find((f) => f.key === 'etc')
    return etc
      ? rest.map((f) => (f.key === 'etc' ? { ...f, files: [...f.files, ...target.files] } : f))
      : [...rest, { key: 'etc', name: evidenceKindName('etc'), tags: [], files: [...target.files] }]
  })
}

export function addFiles(tree, caseKey, folderKey, files) {
  return mapFolders(tree, caseKey, (fs) => {
    if (fs.some((f) => f.key === folderKey)) {
      return fs.map((f) => (f.key === folderKey ? { ...f, files: [...f.files, ...files] } : f))
    }
    return [...fs, { key: folderKey, name: evidenceKindName(folderKey), tags: [], files: [...files] }]
  })
}

/** 파일명으로 종류를 짐작해 알아서 나눠 넣는다 (사건 폴더 위에 그냥 떨어뜨렸을 때) */
export function addFilesAuto(tree, caseKey, files) {
  return mapFolders(tree, caseKey, (fs) => {
    const next = fs.map((f) => ({ ...f, files: [...f.files] }))
    files.forEach((f) => place(next, f))
    return next
  })
}

/** 파일을 다른 폴더로 옮긴다. 사건이 달라도 된다 — 잘못 넣은 사건을 바로잡는 일이 실제로 많다. */
export function moveFiles(tree, fromCaseKey, ids, toCaseKey, toFolderKey) {
  const set = new Set(ids)
  const from = findCase(tree, fromCaseKey)
  const moving = (from?.folders || []).flatMap((f) => f.files.filter((x) => set.has(x.id)))
  if (moving.length === 0) return tree
  const pulled = mapFolders(tree, fromCaseKey, (fs) =>
    fs.map((f) => ({ ...f, files: f.files.filter((x) => !set.has(x.id)) })))
  return addFiles(pulled, toCaseKey, toFolderKey, moving)
}

export const removeFiles = (tree, caseKey, ids) => {
  const set = new Set(ids)
  return mapFolders(tree, caseKey, (fs) => fs.map((f) => ({ ...f, files: f.files.filter((x) => !set.has(x.id)) })))
}

/** 파일 이름을 바꾼다. 사건 자료는 id도 이름으로 잡혀 있으니 함께 옮겨 준다. */
export const renameFile = (tree, caseKey, id, name) =>
  mapFolders(tree, caseKey, (fs) => fs.map((f) => ({
    ...f,
    files: f.files.map((x) => (x.id === id ? { ...x, name, id: isCaseFile(x) ? evId(name) : x.id } : x)),
  })))
