import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import './ManualTimetablePage.css'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const hierarchyFields = ['academicYearId', 'departmentId', 'programId', 'batchId', 'semesterId', 'sectionId']
const emptyOptions = {
  academicYears: [], departments: [], programs: [], batches: [], semesters: [], sections: [],
  subjects: [], faculty: [], rooms: [], labs: [], workingDays: [], timeSlots: [],
}

function ManualTimetablePage({ session }) {
  const [options, setOptions] = useState(emptyOptions)
  const [selection, setSelection] = useState(() => ({
    academicYearId: '',
    departmentId: session.role === 'department-admin' ? String(session.departmentId || '') : '',
    programId: '', batchId: '', semesterId: '', sectionId: '',
  }))
  const [entries, setEntries] = useState([])
  const [versions, setVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [comparisonEntries, setComparisonEntries] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [notice, setNotice] = useState('')
  const [conflictDetails, setConflictDetails] = useState([])
  const [validation, setValidation] = useState(null)
  const [validating, setValidating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    const query = new URLSearchParams()
    if (session.role === 'department-admin' && session.departmentId) query.set('departmentId', session.departmentId)
    apiRequest(`/admin/manual-timetable/options?${query.toString()}`)
      .then((result) => { if (active) setOptions(result) })
      .catch((error) => { if (active) setNotice(error.message) })
      .finally(() => { if (active) setOptionsLoading(false) })
    return () => { active = false }
  }, [session.departmentId, session.role])

  const hasSelection = hierarchyFields.every((field) => selection[field])
  const selectionQuery = new URLSearchParams(Object.fromEntries(
    hierarchyFields.map((field) => [field, selection[field]]),
  )).toString()
  const selectedVersion = versions.find((version) => String(version.id) === selectedVersionId)
  const publishedVersion = versions.find((version) => version.status === 'Published')
  const comparisonVersion = selectedVersion?.basedOnVersionId
    ? versions.find((version) => version.id === selectedVersion.basedOnVersionId)
    : null
  const isDraftVersion = selectedVersion?.status === 'Draft'

  useEffect(() => {
    let active = true
    if (!hasSelection) return () => { active = false }
    apiRequest(`/admin/manual-timetable/versions?${selectionQuery}`)
      .then((result) => {
        if (!active) return
        setVersions(result.versions)
        const preferred = result.versions.find((version) => version.status === 'Draft')
          || result.versions.find((version) => version.id === result.currentPublishedVersionId)
          || result.versions[0]
        setSelectedVersionId((current) => result.versions.some((version) => String(version.id) === current)
          ? current : String(preferred?.id || ''))
      })
      .catch((error) => { if (active) setNotice(error.message) })
    return () => { active = false }
  }, [hasSelection, selectionQuery, reloadKey])

  useEffect(() => {
    let active = true
    if (!hasSelection || !selectedVersionId) {
      return () => { active = false }
    }
    const query = new URLSearchParams(selectionQuery)
    query.set('versionId', selectedVersionId)
    apiRequest(`/admin/manual-timetable/entries?${query.toString()}`)
      .then((result) => { if (active) setEntries(result.entries) })
      .catch((error) => { if (active) setNotice(error.message) })
    return () => { active = false }
  }, [hasSelection, selectionQuery, selectedVersionId, reloadKey])

  useEffect(() => {
    let active = true
    if (!hasSelection || !comparisonVersion) return () => { active = false }
    const query = new URLSearchParams(selectionQuery)
    query.set('versionId', String(comparisonVersion.id))
    apiRequest(`/admin/manual-timetable/entries?${query.toString()}`)
      .then((result) => { if (active) setComparisonEntries(result.entries) })
      .catch((error) => { if (active) setNotice(error.message) })
    return () => { active = false }
  }, [hasSelection, selectionQuery, comparisonVersion])

  function changeSelection(field, value) {
    const resetFields = {
      academicYearId: ['programId', 'batchId', 'semesterId', 'sectionId'],
      departmentId: ['programId', 'batchId', 'semesterId', 'sectionId'],
      programId: ['batchId', 'semesterId', 'sectionId'],
      batchId: ['semesterId', 'sectionId'],
      semesterId: ['sectionId'],
    }
    setSelection((current) => {
      const next = { ...current, [field]: value }
      for (const resetField of resetFields[field] || []) next[resetField] = ''
      if (field === 'academicYearId' && session.role === 'academic-admin') next.departmentId = ''
      return next
    })
    setNotice('')
    setValidation(null)
    setSelectedVersionId('')
  }

  const selectedDepartment = options.departments.find((item) => String(item.id) === selection.departmentId)
  const departmentOptions = options.departments.filter((item) => (
    !selection.academicYearId || (item.academicYearIds || []).includes(Number(selection.academicYearId))
  ))
  const programOptions = options.programs.filter((item) => !selection.departmentId || item.departmentId === Number(selection.departmentId))
  const batchOptions = options.batches.filter((item) => (
    (!selection.academicYearId || item.academicYearId === Number(selection.academicYearId))
    && (!selection.departmentId || item.departmentId === Number(selection.departmentId))
    && (!selection.programId || item.programId === Number(selection.programId))
  ))
  const semesterOptions = options.semesters.filter((item) => !selection.batchId || item.batchId === Number(selection.batchId))
  const sectionOptions = options.sections.filter((item) => !selection.semesterId || item.semesterId === Number(selection.semesterId))
  const selectedSubjects = options.subjects.filter((item) => (
    (!selection.academicYearId || item.academicYearId === Number(selection.academicYearId))
    && (!selection.departmentId || item.departmentId === Number(selection.departmentId))
    && (!selection.programId || item.programId === Number(selection.programId))
    && (!selection.batchId || item.batchId === Number(selection.batchId))
    && (!selection.semesterId || item.semesterId === Number(selection.semesterId))
  ))
  const selectedFaculty = options.faculty.filter((item) => !selection.departmentId || item.departmentId === Number(selection.departmentId))
  const departmentRooms = options.rooms.filter((item) => !selectedDepartment || item.campusId === selectedDepartment.campusId)
  const departmentLabs = options.labs.filter((item) => !selectedDepartment || item.campusId === selectedDepartment.campusId)
  const workingDays = options.workingDays.slice().sort((left, right) => weekdays.indexOf(left) - weekdays.indexOf(right))
  const activeSlots = options.timeSlots.filter((slot) => workingDays.includes(slot.day) && slot.status === 'Active')
  const slotRows = [...new Map(activeSlots.map((slot) => [`${slot.start}-${slot.end}`, { start: slot.start, end: slot.end }])).values()]
    .sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end))
  const entriesByCell = new Map(entries.map((entry) => [`${entry.day}|${entry.start}|${entry.end}`, entry]))
  const comparisonByCell = new Map(comparisonEntries.map((entry) => [`${entry.day}|${entry.start}|${entry.end}`, entry]))
  const versionChanges = comparisonVersion ? [
    ...entries.filter((entry) => !comparisonByCell.has(`${entry.day}|${entry.start}|${entry.end}`)).map((entry) => ({ type: 'Added', entry })),
    ...entries.filter((entry) => {
      const previous = comparisonByCell.get(`${entry.day}|${entry.start}|${entry.end}`)
      return previous && (previous.subjectId !== entry.subjectId || previous.facultyId !== entry.facultyId
        || previous.roomId !== entry.roomId || previous.classType !== entry.classType)
    }).map((entry) => ({ type: 'Changed', entry })),
    ...comparisonEntries.filter((entry) => !entriesByCell.has(`${entry.day}|${entry.start}|${entry.end}`)).map((entry) => ({ type: 'Removed', entry })),
  ] : []

  function openEditor(slot, entry = null) {
    if (!isDraftVersion) return
    const initialSubject = entry
      ? selectedSubjects.find((item) => item.id === entry.subjectId)
      : selectedSubjects[0]
    const classType = entry?.classType || (initialSubject?.requiresLab ? 'LAB' : 'LECTURE')
    const rooms = classType === 'LAB' ? departmentLabs : departmentRooms
    setEditing(entry)
    setForm({
      day: entry?.day || slot.day,
      timeSlotId: String(entry?.timeSlotId || slot.id),
      subjectId: String(entry?.subjectId || initialSubject?.id || ''),
      facultyId: String(entry?.facultyId || selectedFaculty[0]?.id || ''),
      roomId: String(entry?.roomId || rooms[0]?.id || ''),
      classType,
    })
    setEditorOpen(true)
    setNotice('')
    setConflictDetails([])
  }

  async function saveEntry(event) {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    setConflictDetails([])
    setValidation(null)
    try {
      const payload = {
        ...selection, versionId: Number(selectedVersionId), subjectId: Number(form.subjectId), facultyId: Number(form.facultyId),
        roomId: Number(form.roomId), day: form.day, timeSlotId: Number(form.timeSlotId), classType: form.classType,
      }
      const path = `/admin/manual-timetable/entries${editing ? `/${editing.id}` : ''}`
      await apiRequest(path, { method: editing ? 'PATCH' : 'POST', body: payload })
      setEditorOpen(false)
      setNotice(editing ? 'Timetable entry updated.' : 'Timetable entry added.')
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
      setConflictDetails(error.conflicts || [])
    } finally {
      setSaving(false)
    }
  }

  async function validateTimetable() {
    setValidating(true)
    setNotice('')
    try {
      setValidation(await apiRequest('/admin/manual-timetable/validate', { method: 'POST', body: { ...selection, versionId: Number(selectedVersionId) } }))
    } catch (error) {
      setNotice(error.message)
      setValidation(null)
    } finally {
      setValidating(false)
    }
  }

  async function generateTimetable() {
    setGenerating(true)
    setNotice('')
    try {
      const result = await apiRequest('/admin/manual-timetable/generate', { method: 'POST', body: { ...selection, versionId: Number(selectedVersionId) } })
      setValidation(result.validation)
      setNotice(`Generated ${result.count} draft entries. Review the timetable below.`)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setValidation({ valid: false, conflicts: error.conflicts || [] })
      setNotice(error.message)
    } finally {
      setGenerating(false)
    }
  }

  async function createVersion() {
    setCreatingVersion(true)
    setNotice('')
    try {
      const result = await apiRequest('/admin/manual-timetable/versions', { method: 'POST', body: selection })
      setSelectedVersionId(String(result.version.id))
      setValidation(null)
      setNotice(`Version ${result.version.versionNumber} created as Draft from the published timetable.`)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setCreatingVersion(false)
    }
  }

  async function deleteEntry(entry) {
    if (!isDraftVersion) return
    if (!window.confirm(`Delete ${entry.subject} from ${entry.day} ${entry.start}?`)) return
    try {
      await apiRequest(`/admin/manual-timetable/entries/${entry.id}`, { method: 'DELETE' })
      setNotice('Timetable entry deleted.')
      setValidation(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
    }
  }

  const formDaySlots = activeSlots.filter((slot) => slot.day === form?.day && slot.type === 'CLASS')
  const formRooms = form?.classType === 'LAB' ? departmentLabs : departmentRooms

  return (
    <section className="admin-panel manual-timetable-panel">
      <div className="admin-panel-heading manual-timetable-heading">
        <div><p className="admin-kicker">MANUAL TIMETABLE</p><h2>Build a section timetable</h2><p>Choose the academic structure to load its subjects, faculty, rooms, and class periods.</p></div>
        <div className="manual-timetable-actions">
          <button className="admin-secondary-button" type="button" disabled={!hasSelection || !selectedVersionId || validating || generating} onClick={validateTimetable}>{validating ? 'Validating...' : 'Validate timetable'}</button>
          <button className="admin-primary-button" type="button" disabled={!hasSelection || !isDraftVersion || generating || validating} onClick={generateTimetable}>{generating ? 'Generating...' : 'Generate draft'}</button>
        </div>
      </div>
      <div className="manual-selection-grid">
        <label>Academic year<select value={selection.academicYearId} onChange={(event) => changeSelection('academicYearId', event.target.value)} disabled={optionsLoading}>
          <option value="">Select year</option>{options.academicYears.filter((year) => !selectedDepartment || session.role !== 'department-admin' || (selectedDepartment.academicYearIds || []).includes(year.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Department<select value={selection.departmentId} onChange={(event) => changeSelection('departmentId', event.target.value)} disabled={optionsLoading || session.role === 'department-admin' || !selection.academicYearId}>
          <option value="">Select department</option>{departmentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Program<select value={selection.programId} onChange={(event) => changeSelection('programId', event.target.value)} disabled={!selection.departmentId}>
          <option value="">Select program</option>{programOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Batch<select value={selection.batchId} onChange={(event) => changeSelection('batchId', event.target.value)} disabled={!selection.programId}>
          <option value="">Select batch</option>{batchOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
        </select></label>
        <label>Semester<select value={selection.semesterId} onChange={(event) => changeSelection('semesterId', event.target.value)} disabled={!selection.batchId}>
          <option value="">Select semester</option>{semesterOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Section<select value={selection.sectionId} onChange={(event) => changeSelection('sectionId', event.target.value)} disabled={!selection.semesterId}>
          <option value="">Select section</option>{sectionOptions.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
        </select></label>
      </div>
      {hasSelection && <div className="manual-version-bar">
        <label>Timetable version<select value={selectedVersionId} onChange={(event) => {
          setSelectedVersionId(event.target.value)
          setValidation(null)
        }}>
          {versions.map((version) => <option key={version.id} value={version.id}>Version {version.versionNumber} · {version.status}</option>)}
        </select></label>
        {publishedVersion && <span className="published-version-marker">Current published: V{publishedVersion.versionNumber}</span>}
        {publishedVersion && versions[0]?.id === publishedVersion.id && !versions.some((version) => version.status === 'Draft') && <button className="admin-secondary-button" type="button" disabled={creatingVersion} onClick={createVersion}>{creatingVersion ? 'Creating...' : 'New version from published'}</button>}
      </div>}
      {comparisonVersion && <section className="version-comparison-summary">
        <strong>Changes from Version {comparisonVersion.versionNumber}</strong>
        {versionChanges.length ? <ul>{versionChanges.map(({ type, entry }, index) => <li key={`${type}-${entry.id}-${index}`}><span>{type}</span>{entry.day} {entry.start}-{entry.end} · {entry.subject} · {entry.faculty} · {entry.room}</li>)}</ul> : <p>No timetable changes from the published version.</p>}
      </section>}
      {notice && <p className="admin-notice manual-timetable-notice" role="status">{notice}</p>}
      {validation && <section className={`manual-validation-summary${validation.valid ? ' is-valid' : ' has-conflicts'}`} role={validation.valid ? 'status' : 'alert'}>
        <strong>{validation.valid ? 'Timetable is valid' : `${validation.conflicts.length} issue${validation.conflicts.length === 1 ? '' : 's'} need attention`}</strong>
        {validation.conflicts.length > 0 && <ul>{validation.conflicts.map((item, index) => <li key={`${item.type}-${item.entryId ?? index}`}><span>{item.type.replaceAll('_', ' ')}</span>{item.message}</li>)}</ul>}
      </section>}
      {!hasSelection ? (
        <div className="manual-grid-empty">Select the academic year, department, program, batch, semester, and section to open the timetable grid.</div>
      ) : optionsLoading ? (
        <div className="manual-grid-empty" role="status">Loading timetable...</div>
      ) : (
        <div className="manual-grid-scroll"><table className="manual-timetable-grid">
          <thead><tr><th>Time</th>{workingDays.map((day) => <th key={day}>{day}</th>)}</tr></thead>
          <tbody>
            {slotRows.map((row) => <tr key={`${row.start}-${row.end}`}>
              <th scope="row"><strong>{row.start}</strong><span>{row.end}</span></th>
              {workingDays.map((day) => {
                const slot = activeSlots.find((item) => item.day === day && item.start === row.start && item.end === row.end)
                const entry = slot && entries.find((item) => item.day === day && item.start === row.start && item.end === row.end)
                return <td key={day} className={!slot ? 'is-empty-time' : slot.type !== 'CLASS' ? `is-${slot.type.toLowerCase()}` : ''}>
                  {!slot ? null : slot.type !== 'CLASS' ? <span className="manual-break-label">{slot.type}</span> : entry ? (
                    <article className="manual-entry-card">
                      <strong>{entry.subject}</strong><span>{entry.code} · {entry.classType}</span>
                      <small>{entry.faculty} · {entry.room}</small>
                      {isDraftVersion && <div><button type="button" onClick={() => openEditor(slot, entry)}>Edit / move</button><button type="button" onClick={() => deleteEntry(entry)}>Delete</button></div>}
                    </article>
                  ) : isDraftVersion ? <button className="manual-add-entry" type="button" onClick={() => openEditor(slot)}>Add entry</button> : null}
                </td>
              })}
            </tr>)}
            {!slotRows.length && <tr><td colSpan={workingDays.length + 1} className="manual-grid-empty">No active class periods are configured for the working days.</td></tr>}
          </tbody>
        </table></div>
      )}

      {editorOpen && form && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false) }}>
          <section className="admin-modal manual-entry-modal" role="dialog" aria-modal="true" aria-labelledby="manual-entry-title">
            <div className="admin-modal-heading"><div><p className="admin-kicker">{editing ? 'EDIT TIMETABLE ENTRY' : 'NEW TIMETABLE ENTRY'}</p><h2 id="manual-entry-title">{editing ? 'Edit or move class' : 'Add class to grid'}</h2></div><button className="admin-modal-close" type="button" aria-label="Close dialog" onClick={() => setEditorOpen(false)}>×</button></div>
            <form className="admin-create-form manual-entry-form" onSubmit={saveEntry}>
              <label>Subject<select required value={form.subjectId} onChange={(event) => {
                const subject = selectedSubjects.find((item) => String(item.id) === event.target.value)
                const classType = subject?.requiresLab ? 'LAB' : form.classType
                const rooms = classType === 'LAB' ? departmentLabs : departmentRooms
                setForm({ ...form, subjectId: event.target.value, classType, roomId: rooms.some((room) => String(room.id) === form.roomId) ? form.roomId : String(rooms[0]?.id || '') })
              }}>{selectedSubjects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
              <label>Faculty<select required value={form.facultyId} onChange={(event) => setForm({ ...form, facultyId: event.target.value })}>{selectedFaculty.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Class type<select value={form.classType} onChange={(event) => {
                const classType = event.target.value
                const rooms = classType === 'LAB' ? departmentLabs : departmentRooms
                setForm({ ...form, classType, roomId: rooms.some((room) => String(room.id) === form.roomId) ? form.roomId : String(rooms[0]?.id || '') })
              }}><option value="LECTURE">Lecture</option><option value="LAB">Lab</option></select></label>
              <label>{form.classType === 'LAB' ? 'Laboratory' : 'Room'}<select required value={form.roomId} onChange={(event) => setForm({ ...form, roomId: event.target.value })}>{formRooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></label>
              <label>Day<select value={form.day} onChange={(event) => {
                const nextSlots = activeSlots.filter((slot) => slot.day === event.target.value && slot.type === 'CLASS')
                setForm({ ...form, day: event.target.value, timeSlotId: String(nextSlots[0]?.id || '') })
              }}>{workingDays.map((day) => <option key={day}>{day}</option>)}</select></label>
              <label>Time slot<select required value={form.timeSlotId} onChange={(event) => setForm({ ...form, timeSlotId: event.target.value })}>{formDaySlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.start}–{slot.end}</option>)}</select></label>
              {notice && <p className="manual-entry-error" role="alert">{notice}</p>}
              {conflictDetails.length > 0 && <ul className="manual-conflict-list">{conflictDetails.map((item, index) => <li key={`${item.type}-${item.existingEntryId ?? index}`}><strong>{item.type.replaceAll('_', ' ')}</strong><span>{item.message}</span></li>)}</ul>}
              <div className="admin-modal-actions"><button className="admin-secondary-button" type="button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add entry'}</button></div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default ManualTimetablePage