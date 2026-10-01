import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import './FacultyManagementPage.css'

const emptyProfile = {
  facultyCode: '', name: '', email: '', password: '', departmentId: '', designation: '',
  subjectIds: [], sectionIds: [], maxTeachingHours: 20,
  availableSlots: [], unavailableSlots: [], preferredSlots: [],
}

function SlotEditor({ title, slots, days, onChange }) {
  function updateSlot(index, key, value) {
    onChange(slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, [key]: value } : slot))
  }

  return (
    <fieldset className="faculty-slot-editor">
      <legend>{title}</legend>
      {slots.map((slot, index) => (
        <div className="faculty-slot-row" key={`${title}-${index}`}>
          <select aria-label={`${title} day ${index + 1}`} value={slot.day} onChange={(event) => updateSlot(index, 'day', event.target.value)}>
            {days.map((day) => <option key={day}>{day}</option>)}
          </select>
          <input aria-label={`${title} start ${index + 1}`} type="time" value={slot.start} onChange={(event) => updateSlot(index, 'start', event.target.value)} required />
          <input aria-label={`${title} end ${index + 1}`} type="time" value={slot.end} onChange={(event) => updateSlot(index, 'end', event.target.value)} required />
          <button className="faculty-remove-slot" type="button" aria-label={`Remove ${title.toLowerCase()} slot ${index + 1}`} onClick={() => onChange(slots.filter((_, slotIndex) => slotIndex !== index))}>×</button>
        </div>
      ))}
      <button className="faculty-add-slot" type="button" onClick={() => onChange([...slots, { day: days[0] || 'Monday', start: '09:00', end: '10:00' }])}>Add time slot</button>
    </fieldset>
  )
}

function slotSummary(slots) {
  return slots.length ? slots.map(({ day, start, end }) => `${day} ${start}-${end}`).join(', ') : 'None configured'
}

function FacultyManagementPage() {
  const [records, setRecords] = useState([])
  const [options, setOptions] = useState({ departments: [], subjects: [], sections: [], days: [] })
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [profile, setProfile] = useState(emptyProfile)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [details, setDetails] = useState(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    const query = new URLSearchParams()
    if (search.trim()) query.set('search', search.trim())
    if (departmentFilter) query.set('departmentId', departmentFilter)
    if (statusFilter) query.set('status', statusFilter)
    apiRequest(`/system/faculty?${query.toString()}`)
      .then((result) => {
        if (!active) return
        setRecords(result.records)
        setOptions(result.options)
        setNotice('')
      })
      .catch((error) => { if (active) setNotice(error.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [search, departmentFilter, statusFilter, reloadKey])

  function openEditor(record = null) {
    setEditing(record)
    setEditorOpen(true)
    setProfile(record ? {
      ...record, password: '', subjectIds: record.subjectIds.map(String), sectionIds: record.sectionIds.map(String),
    } : { ...emptyProfile, departmentId: String(options.departments[0]?.id || '') })
    setNotice('')
  }

  async function saveFaculty(event) {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    const payload = {
      ...profile,
      departmentId: Number(profile.departmentId),
      maxTeachingHours: Number(profile.maxTeachingHours),
      subjectIds: profile.subjectIds.map(Number),
      sectionIds: profile.sectionIds.map(Number),
    }
    if (editing && !payload.password) delete payload.password
    try {
      await apiRequest(`/system/faculty${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST', body: payload,
      })
      setEditorOpen(false)
      setNotice(editing ? 'Faculty profile updated.' : 'Faculty member added.')
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeFaculty(record) {
    if (!window.confirm(`Delete ${record.name}?`)) return
    try {
      await apiRequest(`/system/faculty/${record.id}`, { method: 'DELETE' })
      setNotice(`${record.name} was deleted.`)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function showDetails(record) {
    try {
      const result = await apiRequest(`/system/faculty/${record.id}`)
      setDetails(result.record)
    } catch (error) {
      setNotice(error.message)
    }
  }

  const departmentSubjects = options.subjects.filter((subject) => subject.departmentId === Number(profile.departmentId))
  const departmentSections = options.sections.filter((section) => section.departmentId === Number(profile.departmentId))
  const days = options.days.length ? options.days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  return (
    <section className="super-panel faculty-panel">
      <div className="super-panel-heading faculty-heading">
        <div><p className="super-kicker">ACADEMIC STAFF</p><h2>Faculty management</h2><p>Manage teaching assignments, workload limits, and structured availability.</p></div>
        <button className="super-primary-button" type="button" onClick={() => openEditor()}><span aria-hidden="true">+</span> Add faculty</button>
      </div>
      <div className="faculty-toolbar">
        <label className="entity-search"><span aria-hidden="true">⌕</span><input aria-label="Search faculty" type="search" placeholder="Search name, faculty ID, or designation" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select aria-label="Filter faculty by department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
          <option value="">All departments</option>{options.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
        <select aria-label="Filter faculty by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option><option>Active</option><option>Inactive</option>
        </select>
        <span>{records.length} faculty</span>
      </div>
      {notice && <p className="super-notice faculty-notice" role="status">{notice}</p>}
      <div className="super-table-scroll"><table className="super-table faculty-table">
        <thead><tr><th>Faculty ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Subjects</th><th>Sections</th><th>Maximum hours</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {records.map((record) => <tr key={record.id}>
            <td><strong>{record.facultyCode}</strong></td><td>{record.name}<span>{record.email}</span></td><td>{record.department}</td><td>{record.designation || 'Not set'}</td>
            <td>{record.subjects.length ? record.subjects.join(', ') : 'None assigned'}</td><td>{record.sections.length ? record.sections.join(', ') : 'None assigned'}</td>
            <td>{record.maxTeachingHours} h</td><td><span className={`super-status-pill ${record.status === 'Active' ? 'is-active' : ''}`}>{record.status}</span></td>
            <td><div className="record-actions"><button type="button" onClick={() => showDetails(record)}>Details</button><button type="button" onClick={() => openEditor(record)}>Edit</button><button type="button" onClick={() => removeFaculty(record)}>Delete</button></div></td>
          </tr>)}
          {!loading && records.length === 0 && <tr><td className="super-no-results" colSpan="9">No matching faculty records.</td></tr>}
          {loading && <tr><td className="super-no-results" colSpan="9">Loading faculty records...</td></tr>}
        </tbody>
      </table></div>

      {editorOpen && (
        <div className="super-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false) }}>
          <section className="super-modal faculty-modal" role="dialog" aria-modal="true" aria-labelledby="faculty-modal-title">
            <div className="super-modal-heading"><div><p className="super-kicker">FACULTY PROFILE</p><h2 id="faculty-modal-title">{editing ? 'Edit faculty' : 'Add faculty'}</h2></div><button type="button" className="super-modal-close" aria-label="Close dialog" onClick={() => setEditorOpen(false)}>×</button></div>
            <form className="faculty-form" onSubmit={saveFaculty}>
              <label>Faculty ID<input required maxLength="30" value={profile.facultyCode} onChange={(event) => setProfile({ ...profile, facultyCode: event.target.value })} /></label>
              <label>Full name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
              <label>Email address<input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
              <label>{editing ? 'New password' : 'Initial password'}<input type="password" minLength="8" autoComplete="new-password" required={!editing} value={profile.password} onChange={(event) => setProfile({ ...profile, password: event.target.value })} /></label>
              <label>Department<select required value={profile.departmentId} onChange={(event) => setProfile({ ...profile, departmentId: event.target.value, subjectIds: [], sectionIds: [] })}>{options.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
              <label>Designation<input required value={profile.designation} onChange={(event) => setProfile({ ...profile, designation: event.target.value })} /></label>
              <label>Maximum teaching hours per week<input type="number" min="1" max="60" required value={profile.maxTeachingHours} onChange={(event) => setProfile({ ...profile, maxTeachingHours: event.target.value })} /></label>
              <label>Assigned subjects<select multiple value={profile.subjectIds} onChange={(event) => setProfile({ ...profile, subjectIds: [...event.target.selectedOptions].map((option) => option.value) })}>{departmentSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.label}</option>)}</select></label>
              <label>Assigned sections<select multiple value={profile.sectionIds} onChange={(event) => setProfile({ ...profile, sectionIds: [...event.target.selectedOptions].map((option) => option.value) })}>{departmentSections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>
              <SlotEditor title="Available time slots" slots={profile.availableSlots} days={days} onChange={(availableSlots) => setProfile({ ...profile, availableSlots })} />
              <SlotEditor title="Unavailable time slots" slots={profile.unavailableSlots} days={days} onChange={(unavailableSlots) => setProfile({ ...profile, unavailableSlots })} />
              <SlotEditor title="Preferred time slots" slots={profile.preferredSlots} days={days} onChange={(preferredSlots) => setProfile({ ...profile, preferredSlots })} />
              {notice && <p className="faculty-form-notice" role="alert">{notice}</p>}
              <div className="super-modal-actions"><button className="super-secondary-button" type="button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="super-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add faculty'}</button></div>
            </form>
          </section>
        </div>
      )}

      {details && (
        <div className="super-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetails(null) }}>
          <section className="super-modal faculty-details" role="dialog" aria-modal="true" aria-labelledby="faculty-details-title">
            <div className="super-modal-heading"><div><p className="super-kicker">FACULTY DETAILS</p><h2 id="faculty-details-title">{details.name}</h2></div><button type="button" className="super-modal-close" aria-label="Close details" onClick={() => setDetails(null)}>×</button></div>
            <dl><div><dt>Faculty ID</dt><dd>{details.facultyCode}</dd></div><div><dt>Department</dt><dd>{details.department}</dd></div><div><dt>Designation</dt><dd>{details.designation}</dd></div><div><dt>Subjects</dt><dd>{details.subjects.join(', ') || 'None assigned'}</dd></div><div><dt>Sections</dt><dd>{details.sections.join(', ') || 'None assigned'}</dd></div><div><dt>Maximum weekly hours</dt><dd>{details.maxTeachingHours}</dd></div><div><dt>Available</dt><dd>{slotSummary(details.availableSlots)}</dd></div><div><dt>Unavailable</dt><dd>{slotSummary(details.unavailableSlots)}</dd></div><div><dt>Preferred</dt><dd>{slotSummary(details.preferredSlots)}</dd></div></dl>
          </section>
        </div>
      )}
    </section>
  )
}

export default FacultyManagementPage