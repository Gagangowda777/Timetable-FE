import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import FacultyManagementPage from './FacultyManagementPage.jsx'
import RequestFormFieldsPage from './RequestFormFieldsPage.jsx'
import './SuperAdminDashboardPage.css'

const entityDefinitions = {
    'academic-years': {
      title: 'Academic Years',
      singular: 'academic year',
      deletable: true,
      fields: [
        { key: 'name', label: 'Academic year', placeholder: 'e.g. 2027/2028', maxLength: 40 },
        { key: 'startDate', label: 'Start date', type: 'date', required: false },
        { key: 'endDate', label: 'End date', type: 'date', required: false },
      ],
    },
  users: {
    title: 'Users',
    singular: 'user',
    fields: [
      { key: 'name', label: 'Full name', placeholder: 'e.g. Jordan Mensah' },
      { key: 'email', label: 'Email address', type: 'email', placeholder: 'name@campus.edu' },
      { key: 'role', label: 'Role', control: 'select', options: ['Student', 'Faculty', 'Department Admin', 'Academic Admin', 'Super Admin'] },
      { key: 'department', label: 'Department', control: 'select', options: ['Computer Science', 'Electrical Engineering', 'Business Studies', 'Institution'] },
      { key: 'program', label: 'Program', control: 'select' },
      { key: 'cohort', label: 'Cohort / group', placeholder: 'e.g. Year 2 · Group A' },
      { key: 'campus', label: 'Campus', control: 'select' },
    ],
  },
  departments: {
    title: 'Departments',
    singular: 'department',
    deletable: true,
    fields: [
      { key: 'name', label: 'Department name', placeholder: 'e.g. Computer Science' },
      { key: 'code', label: 'Department code', placeholder: 'e.g. CSC' },
      { key: 'academicYearIds', displayKey: 'academicYears', label: 'Academic years', control: 'select', multiple: true },
      { key: 'campus', label: 'Campus', control: 'select' },
      { key: 'head', label: 'Department head', placeholder: 'e.g. Dr. Mensah' },
    ],
  },
  programs: {
    title: 'Programs',
    singular: 'program',
    deletable: true,
    fields: [
      { key: 'name', label: 'Program name', placeholder: 'e.g. Computer Science' },
      { key: 'code', label: 'Program code', placeholder: 'e.g. BSC-CS' },
      { key: 'departmentId', displayKey: 'department', label: 'Department', control: 'select' },
      { key: 'level', label: 'Award level', control: 'select', options: ['Certificate', 'Diploma', 'Bachelor', 'Master', 'Doctorate'] },
    ],
  },
  batches: {
    title: 'Batches',
    singular: 'batch',
    deletable: true,
    fields: [
      { key: 'name', label: 'Batch name', placeholder: 'e.g. 2028 Intake' },
      { key: 'code', label: 'Batch code', placeholder: 'e.g. 2028' },
      { key: 'academicYearId', displayKey: 'academicYear', label: 'Academic year', control: 'select' },
      { key: 'departmentId', displayKey: 'department', label: 'Department', control: 'select' },
      { key: 'programId', displayKey: 'program', label: 'Program', control: 'select' },
    ],
  },
  semesters: {
    title: 'Semesters',
    singular: 'semester',
    deletable: true,
    fields: [
      { key: 'name', label: 'Semester name', placeholder: 'e.g. First semester' },
      { key: 'batchId', displayKey: 'batch', label: 'Batch', control: 'select' },
      { key: 'startDate', label: 'Start date', type: 'date', required: false },
      { key: 'endDate', label: 'End date', type: 'date', required: false },
    ],
  },
  sections: {
    title: 'Sections',
    singular: 'section',
    deletable: true,
    fields: [
      { key: 'name', label: 'Section name', placeholder: 'e.g. Section A' },
      { key: 'code', label: 'Section code', placeholder: 'e.g. A' },
      { key: 'semesterId', displayKey: 'semester', label: 'Semester', control: 'select' },
    ],
  },
  subjects: {
    title: 'Subjects',
    singular: 'subject',
    deletable: true,
    fields: [
      { key: 'code', label: 'Subject code', placeholder: 'e.g. CSC 220', maxLength: 30 },
      { key: 'name', label: 'Subject name', placeholder: 'e.g. Data Structures', maxLength: 120 },
      { key: 'type', label: 'Subject type', control: 'select', options: ['Core', 'Elective', 'General'] },
      { key: 'academicYearId', displayKey: 'academicYear', label: 'Academic year', control: 'select' },
      { key: 'departmentId', displayKey: 'department', label: 'Department', control: 'select' },
      { key: 'programId', displayKey: 'program', label: 'Program', control: 'select' },
      { key: 'batchId', displayKey: 'batch', label: 'Batch', control: 'select' },
      { key: 'semesterId', displayKey: 'semester', label: 'Semester', control: 'select' },
      { key: 'credits', label: 'Credits', type: 'number', min: 1, max: 30 },
      { key: 'weeklyHours', label: 'Weekly hours', type: 'number', min: 1, max: 40 },
      { key: 'theoryHours', label: 'Theory hours', type: 'number', min: 0, max: 40 },
      { key: 'practicalHours', label: 'Practical hours', type: 'number', min: 0, max: 40 },
      { key: 'facultyId', displayKey: 'faculty', label: 'Assigned faculty', control: 'select', required: false },
      { key: 'requiresLab', label: 'Requires lab', control: 'checkbox' },
    ],
  },
  campuses: {
    title: 'Campuses',
    singular: 'campus',
    fields: [
      { key: 'name', label: 'Campus name', placeholder: 'e.g. Main Campus' },
      { key: 'code', label: 'Campus code', placeholder: 'e.g. MAIN' },
      { key: 'location', label: 'Location', placeholder: 'City or address' },
    ],
  },
  rooms: {
    title: 'Rooms',
    singular: 'room',
    fields: [
      { key: 'name', label: 'Room name', placeholder: 'e.g. Lecture Hall A' },
      { key: 'code', label: 'Room code', placeholder: 'e.g. LH-A01' },
      { key: 'campus', label: 'Campus', control: 'select' },
      { key: 'capacity', label: 'Capacity', type: 'number', placeholder: 'e.g. 80' },
      { key: 'type', label: 'Room type', control: 'select', options: ['Lecture hall', 'Classroom', 'Laboratory', 'Studio', 'Meeting room'] },
    ],
  },
}

const emptyRecords = { 'academic-years': [], users: [], departments: [], programs: [], batches: [], semesters: [], sections: [], subjects: [], campuses: [], rooms: [] }

const navigationItems = [
  ['overview', 'Overview'],
  ['academic-years', 'Academic years'],
  ['departments', 'Departments'],
  ['programs', 'Programs'],
  ['batches', 'Batches'],
  ['semesters', 'Semesters'],
  ['sections', 'Sections'],
  ['subjects', 'Subjects'],
  ['faculty', 'Faculty'],
  ['users', 'Users'],
  ['campuses', 'Campuses'],
  ['rooms', 'Rooms'],
  ['request-forms', 'Request forms'],
  ['settings', 'System settings'],
  ['analytics', 'Analytics'],
  ['audit', 'Audit log'],
]

function SuperAdminDashboardPage({ session, onSignOut }) {
  const [activeView, setActiveView] = useState('overview')
  const [records, setRecords] = useState(emptyRecords)
  const [auditLog, setAuditLog] = useState([])
  const [systemSettings, setSystemSettings] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [formValues, setFormValues] = useState({})
  const [subjectFilters, setSubjectFilters] = useState({ academicYearId: '', departmentId: '', programId: '', batchId: '', semesterId: '', type: '' })
  const [notice, setNotice] = useState('')

  async function refreshOverview() {
    const result = await apiRequest('/system/overview')
    setRecords(result.records)
    setAuditLog(result.audit)
  }

  useEffect(() => {
    let active = true
    Promise.all([apiRequest('/system/overview'), apiRequest('/system/settings')])
      .then(([overview, settings]) => {
        if (!active) return
        setRecords(overview.records)
        setAuditLog(overview.audit)
        setSystemSettings(settings)
      })
      .catch((error) => {
        if (active) setNotice(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (activeView === 'analytics') {
      apiRequest('/system/analytics')
        .then((result) => { if (active) setAnalytics(result) })
        .catch((error) => { if (active) setNotice(error.message) })
    }
    if (activeView === 'audit') {
      apiRequest('/system/audit?limit=200')
        .then((result) => { if (active) setAuditLog(result.events) })
        .catch((error) => { if (active) setNotice(error.message) })
    }
    return () => { active = false }
  }, [activeView])

  async function saveRecord(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const definition = entityDefinitions[modal.entity]
    const values = Object.fromEntries(definition.fields.map((field) => [field.key, field.multiple ? formData.getAll(field.key) : formData.get(field.key)]))
    if (modal.entity === 'users') values.password = formData.get('password') || undefined
    if (modal.entity === 'subjects') {
      values.requiresLab = formData.has('requiresLab')
      const code = String(values.code || '').trim().toUpperCase()
      const duplicate = records.subjects.some((subject) => subject.code.toUpperCase() === code && subject.id !== modal.record?.id)
      const credits = Number(values.credits)
      const weeklyHours = Number(values.weeklyHours)
      const theoryHours = Number(values.theoryHours)
      const practicalHours = Number(values.practicalHours)
      if (duplicate) {
        setNotice('A subject with this code already exists.')
        return
      }
      if (!Number.isInteger(credits) || credits < 1 || credits > 30
        || !Number.isInteger(weeklyHours) || weeklyHours < 1 || weeklyHours > 40
        || !Number.isInteger(theoryHours) || theoryHours < 0 || theoryHours > 40
        || !Number.isInteger(practicalHours) || practicalHours < 0 || practicalHours > 40
        || theoryHours + practicalHours !== weeklyHours
        || (values.requiresLab && practicalHours === 0)) {
        setNotice('Check credits, weekly hours, and theory/practical requirements.')
        return
      }
    }
    const hasStartDate = Boolean(values.startDate)
    const hasEndDate = Boolean(values.endDate)
    if (hasStartDate !== hasEndDate || (hasStartDate && values.startDate >= values.endDate)) {
      setNotice('Provide both dates and make sure the end date follows the start date.')
      return
    }
    if (modal.entity === 'semesters' && hasStartDate) {
      const batch = records.batches.find((item) => String(item.id) === values.batchId)
      const academicYear = records['academic-years'].find((item) => item.id === batch?.academicYearId)
      if (academicYear?.startDate && (values.startDate < academicYear.startDate || values.endDate > academicYear.endDate)) {
        setNotice('Semester dates must fall within the selected academic year.')
        return
      }
    }

    try {
      const path = `/system/${modal.entity}${modal.record ? `/${modal.record.id}` : ''}`
      await apiRequest(path, { method: modal.record ? 'PATCH' : 'POST', body: values })
      await refreshOverview()
      const singular = definition.singular[0].toUpperCase() + definition.singular.slice(1)
      setNotice(`${singular} ${modal.record ? 'updated' : 'created'}.`)
      setModal(null)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function toggleRecordStatus(entity, record) {
    const status = record.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await apiRequest(`/system/${entity}/${record.id}/status`, { method: 'PATCH', body: { status } })
      await refreshOverview()
      setNotice(`${record.name || record.email || record.code} is now ${status.toLowerCase()}.`)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function deleteRecord(entity, record) {
    if (!window.confirm(`Delete ${record.name || record.code}? This is only allowed when no child records depend on it.`)) return
    try {
      await apiRequest(`/system/${entity}/${record.id}`, { method: 'DELETE' })
      await refreshOverview()
      const singular = entityDefinitions[entity].singular
      setNotice(`${singular[0].toUpperCase()}${singular.slice(1)} deleted.`)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function saveSystemSettings(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const values = {
      institutionName: formData.get('institutionName'),
      academicYear: formData.get('academicYear'),
      semester: formData.get('semester'),
      timeZone: formData.get('timeZone'),
      auditRetention: formData.get('auditRetention'),
      conflictDetection: formData.get('conflictDetection') === 'on',
      userRegistration: formData.get('userRegistration') === 'on',
    }
    try {
      const savedSettings = await apiRequest('/system/settings', { method: 'PUT', body: values })
      setSystemSettings(savedSettings)
      await refreshOverview()
      setNotice('System settings saved.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  function optionsForField(field, values = {}) {
    if (field.key === 'campus') return records.campuses.filter((campus) => campus.status === 'Active').map((campus) => ({ value: campus.name, label: campus.name }))
    if (field.key === 'department') {
      const departments = records.departments.filter((department) => department.status === 'Active').map((department) => ({ value: department.name, label: department.name }))
      return field.options?.includes('Institution') ? [...departments, { value: 'Institution', label: 'Institution' }] : departments
    }
    if (field.key === 'academicYearIds' || field.key === 'academicYearId') {
      return records['academic-years'].filter((year) => year.status === 'Active').map((year) => ({ value: String(year.id), label: year.name }))
    }
    if (field.key === 'departmentId') {
      const academicYearId = values.academicYearId
      return records.departments.filter((department) => department.status === 'Active'
        && (!academicYearId || department.academicYearIds?.includes(Number(academicYearId))))
        .map((department) => ({ value: String(department.id), label: department.name }))
    }
    if (field.key === 'programId') {
      const departmentId = Number(values.departmentId)
      return records.programs.filter((program) => program.status === 'Active' && program.departmentId === departmentId)
        .map((program) => ({ value: String(program.id), label: program.name }))
    }
    if (field.key === 'batchId') {
      return records.batches.filter((batch) => batch.status === 'Active'
        && (!values.academicYearId || batch.academicYearId === Number(values.academicYearId))
        && (!values.departmentId || batch.departmentId === Number(values.departmentId))
        && (!values.programId || batch.programId === Number(values.programId)))
        .map((batch) => ({ value: String(batch.id), label: `${batch.name} · ${batch.program} · ${batch.academicYear}` }))
    }
    if (field.key === 'semesterId') {
      return records.semesters.filter((semester) => semester.status === 'Active'
        && (!values.batchId || semester.batchId === Number(values.batchId)))
        .map((semester) => ({ value: String(semester.id), label: `${semester.name} · ${semester.batch}` }))
    }
    if (field.key === 'facultyId') {
      const department = records.departments.find((item) => item.id === Number(values.departmentId))
      return records.users.filter((user) => user.status === 'Active' && user.role === 'Faculty'
        && (!department || user.department === department.name))
        .map((user) => ({ value: String(user.id), label: user.name }))
    }
    if (field.key === 'program') {
      return records.programs.filter((program) => program.status === 'Active'
        && (!values.department || program.department === values.department))
        .map((program) => ({ value: program.name, label: program.name }))
    }
    return (field.options || []).map((option) => ({ value: option, label: option }))
  }

  function openEntityModal(entity, record = null) {
    const values = {}
    for (const field of entityDefinitions[entity].fields) {
      const recordValue = record?.[field.key]
      if (field.control === 'checkbox') {
        values[field.key] = Boolean(recordValue)
      } else if (recordValue !== undefined && recordValue !== null) {
        values[field.key] = field.multiple ? recordValue.map(String) : String(recordValue)
      } else if (field.control === 'select') {
        const options = optionsForField(field, values)
        values[field.key] = field.multiple
          ? (options[0] ? [String(options[0].value)] : [])
          : field.required === false ? '' : String(options[0]?.value ?? '')
      } else {
        values[field.key] = ''
      }
    }
    setFormValues(values)
    setModal({ entity, record })
  }

  function renderEntityField(field, record, values) {
    const options = optionsForField(field, values)
    return (
      <label className={field.control === 'checkbox' ? 'subject-checkbox-field' : undefined} key={field.key}>
        {field.label}
        {field.control === 'checkbox' ? (
          <input name={field.key} type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.checked }))} />
        ) : field.control === 'select' ? (
          <select
            name={field.key}
            multiple={field.multiple}
            required={field.required !== false}
            value={field.multiple ? (values[field.key] || []) : (values[field.key] || '')}
            onChange={(event) => setFormValues((current) => ({
              ...current,
              [field.key]: field.multiple
                ? [...event.target.selectedOptions].map((option) => option.value)
                : event.target.value,
              ...(field.key === 'academicYearId' ? { departmentId: '', programId: '', batchId: '', semesterId: '' } : {}),
              ...(field.key === 'departmentId' ? { programId: '', batchId: '', semesterId: '' } : {}),
              ...(field.key === 'programId' ? { batchId: '', semesterId: '' } : {}),
              ...(field.key === 'batchId' ? { semesterId: '' } : {}),
            }))}
          >
            {!field.multiple && <option value="">Select {field.label.toLowerCase()}</option>}
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : (
          <input
            name={field.key}
            type={field.type || 'text'}
            placeholder={field.placeholder}
            defaultValue={record?.[field.key] ?? ''}
            maxLength={field.maxLength}
            min={field.min}
            max={field.max}
            step={field.type === 'number' ? 1 : undefined}
            required={field.required !== false}
          />
        )}
      </label>
    )
  }

  function renderOverview() {
    const activeUsers = records.users.filter((record) => record.status === 'Active').length
    const activeRooms = records.rooms.filter((record) => record.status === 'Active').length
    const metrics = [
      ['ACTIVE USERS', activeUsers, `${records.users.length} total accounts`],
      ['DEPARTMENTS', records.departments.length, 'institution-wide'],
      ['PROGRAMS', records.programs.length, 'across all departments'],
      ['CAMPUSES & ROOMS', `${records.campuses.length} / ${activeRooms}`, 'campuses / active rooms'],
    ]

    return (
      <>
        <section className="super-metrics" aria-label="System summary">
          {metrics.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
        </section>
        <section className="super-overview-grid">
          <div className="super-panel">
            <div className="super-panel-heading"><div><p className="super-kicker">SYSTEM DIRECTORY</p><h2>Institution structure</h2></div><button className="super-link-button" type="button" onClick={() => setActiveView('departments')}>Manage departments <span aria-hidden="true">→</span></button></div>
            <div className="structure-list">
              {records.departments.map((department) => { const programCount = records.programs.filter((program) => program.department === department.name).length; return <article key={department.id}><span className="structure-mark">{department.code.slice(0, 2)}</span><div><strong>{department.name}</strong><small>{department.campus} · {programCount} {programCount === 1 ? 'program' : 'programs'}</small></div><span className="structure-count">{records.users.filter((user) => user.department === department.name).length} users</span></article>})}
            </div>
          </div>
          <div className="super-panel recent-audit-panel">
            <div className="super-panel-heading"><div><p className="super-kicker">SYSTEM ACTIVITY</p><h2>Recent audit events</h2></div><button className="super-link-button" type="button" onClick={() => setActiveView('audit')}>View audit log <span aria-hidden="true">→</span></button></div>
            <div className="recent-audit-list">{auditLog.slice(0, 4).map((event) => <article key={event.id}><span className="audit-timeline-dot" /><div><strong>{event.action}</strong><small>{event.target} · {event.actor}</small></div><time>{event.time}</time></article>)}</div>
          </div>
        </section>
        <section className="super-quick-links" aria-label="System management shortcuts">
          {navigationItems.slice(1, 6).map(([id, label], index) => <button key={id} type="button" onClick={() => setActiveView(id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>Manage {label.toLowerCase()}</strong><small>{records[id].length} records</small></button>)}
        </section>
      </>
    )
  }

  function renderEntityManager(entity) {
    const definition = entityDefinitions[entity]
    const filterBatchIds = new Set(records.batches.filter((batch) => batch.status === 'Active'
      && (!subjectFilters.academicYearId || batch.academicYearId === Number(subjectFilters.academicYearId))
      && (!subjectFilters.departmentId || batch.departmentId === Number(subjectFilters.departmentId))
      && (!subjectFilters.programId || batch.programId === Number(subjectFilters.programId))
      && (!subjectFilters.batchId || batch.id === Number(subjectFilters.batchId))).map((batch) => batch.id))
    const filterSemesters = records.semesters.filter((semester) => semester.status === 'Active' && filterBatchIds.has(semester.batchId))
    const visibleRecords = records[entity]
      .filter((record) => Object.values(record).join(' ').toLowerCase().includes(search.toLowerCase()))
      .filter((record) => entity !== 'subjects' || (
        (!subjectFilters.academicYearId || record.academicYearId === Number(subjectFilters.academicYearId))
        &&
        (!subjectFilters.departmentId || record.departmentId === Number(subjectFilters.departmentId))
        && (!subjectFilters.programId || record.programId === Number(subjectFilters.programId))
        && (!subjectFilters.batchId || record.batchId === Number(subjectFilters.batchId))
        && (!subjectFilters.semesterId || record.semesterId === Number(subjectFilters.semesterId))
        && (!subjectFilters.type || record.type === subjectFilters.type)
      ))

    return (
      <section className="super-panel entity-panel">
        <div className="super-panel-heading">
          <div><p className="super-kicker">SYSTEM DIRECTORY</p><h2>{definition.title}</h2><p>Manage institution-wide {definition.singular} records and status.</p></div>
          <button className="super-primary-button" type="button" onClick={() => openEntityModal(entity)}><span aria-hidden="true">+</span> Add {definition.singular}</button>
        </div>
        <div className={`entity-toolbar${entity === 'subjects' ? ' subject-toolbar' : ''}`}>
          <label className="entity-search"><span aria-hidden="true">⌕</span><input aria-label={`Search ${definition.title.toLowerCase()}`} type="search" placeholder={`Search ${definition.title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          {entity === 'subjects' && <div className="subject-filters">
            <select aria-label="Filter subjects by academic year" value={subjectFilters.academicYearId} onChange={(event) => setSubjectFilters((current) => ({ ...current, academicYearId: event.target.value, departmentId: '', programId: '', batchId: '', semesterId: '' }))}>
              <option value="">All academic years</option>{records['academic-years'].filter((item) => item.status === 'Active').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Filter subjects by department" value={subjectFilters.departmentId} onChange={(event) => setSubjectFilters((current) => ({ ...current, departmentId: event.target.value, programId: '', batchId: '', semesterId: '' }))}>
              <option value="">All departments</option>{records.departments.filter((item) => item.status === 'Active' && (!subjectFilters.academicYearId || item.academicYearIds?.includes(Number(subjectFilters.academicYearId)))).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Filter subjects by program" value={subjectFilters.programId} onChange={(event) => setSubjectFilters((current) => ({ ...current, programId: event.target.value, batchId: '', semesterId: '' }))}>
              <option value="">All programs</option>{records.programs.filter((item) => item.status === 'Active' && (!subjectFilters.departmentId || item.departmentId === Number(subjectFilters.departmentId)) && (!subjectFilters.academicYearId || records.departments.some((department) => department.id === item.departmentId && department.academicYearIds?.includes(Number(subjectFilters.academicYearId))))).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Filter subjects by batch" value={subjectFilters.batchId} onChange={(event) => setSubjectFilters((current) => ({ ...current, batchId: event.target.value, semesterId: '' }))}>
              <option value="">All batches</option>{records.batches.filter((item) => item.status === 'Active' && filterBatchIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Filter subjects by semester" value={subjectFilters.semesterId} onChange={(event) => setSubjectFilters((current) => ({ ...current, semesterId: event.target.value }))}>
              <option value="">All semesters</option>{filterSemesters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select aria-label="Filter subjects by type" value={subjectFilters.type} onChange={(event) => setSubjectFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">All types</option>{entityDefinitions.subjects.fields.find((field) => field.key === 'type').options.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>}
          <span>{visibleRecords.length} of {records[entity].length} records</span>
        </div>
        <div className="super-table-scroll"><table className="super-table"><thead><tr>{definition.fields.map((field) => <th key={field.key}>{field.label}</th>)}<th>Status</th><th>Actions</th></tr></thead><tbody>
          {visibleRecords.map((record) => <tr key={record.id}>{definition.fields.map((field) => <td key={field.key}>{field.displayKey ? record[field.displayKey] : Array.isArray(record[field.key]) ? record[field.key].join(', ') : record[field.key]}</td>)}<td><span className={`super-status-pill ${record.status === 'Active' ? 'is-active' : ''}`}>{record.status}</span></td><td><div className="record-actions"><button type="button" onClick={() => openEntityModal(entity, record)}>Edit</button><button type="button" onClick={() => toggleRecordStatus(entity, record)}>{record.status === 'Active' ? 'Deactivate' : 'Activate'}</button>{definition.deletable && <button type="button" onClick={() => deleteRecord(entity, record)}>Delete</button>}</div></td></tr>)}
          {visibleRecords.length === 0 && <tr><td className="super-no-results" colSpan={definition.fields.length + 2}>No matching records.</td></tr>}
        </tbody></table></div>
      </section>
    )
  }

  function renderSettings() {
    if (!systemSettings) return <div className="super-panel"><p className="super-panel-heading" role="status">Loading system settings...</p></div>
    return (
      <section className="super-panel settings-panel">
        <div className="super-panel-heading"><div><p className="super-kicker">INSTITUTION CONFIGURATION</p><h2>System settings</h2><p>Configure global academic calendar, access, and audit preferences.</p></div></div>
        <form className="super-settings-form" onSubmit={saveSystemSettings}>
          <div className="super-settings-grid">
            <label>Institution name<input name="institutionName" defaultValue={systemSettings.institutionName} required /></label>
            <label>Academic year<select name="academicYear" defaultValue={systemSettings.academicYear} required>{records['academic-years'].filter((year) => year.status === 'Active').map((year) => <option key={year.id}>{year.name}</option>)}</select></label>
            <label>Current semester<select name="semester" defaultValue={systemSettings.semester}><option>First semester</option><option>Second semester</option><option>Summer term</option></select></label>
            <label>System time zone<select name="timeZone" defaultValue={systemSettings.timeZone}><option value="Africa/Lagos">West Africa (Lagos)</option><option value="Europe/London">United Kingdom (London)</option><option value="America/New_York">Eastern Time (New York)</option><option value="UTC">Coordinated Universal Time</option></select></label>
            <label>Audit retention (days)<input name="auditRetention" type="number" min="30" max="3650" defaultValue={systemSettings.auditRetention} required /></label>
          </div>
          <div className="system-toggle-list">
            <label><span><strong>Automatic conflict detection</strong><small>Flag room, faculty, and cohort overlaps in schedules.</small></span><input name="conflictDetection" type="checkbox" defaultChecked={systemSettings.conflictDetection} /></label>
            <label><span><strong>Allow user self-registration</strong><small>Let new users request accounts through the portal.</small></span><input name="userRegistration" type="checkbox" defaultChecked={systemSettings.userRegistration} /></label>
          </div>
          <button className="super-primary-button" type="submit">Save system settings</button>
        </form>
      </section>
    )
  }

  function renderAnalytics() {
    if (!analytics) return <div className="super-panel"><p className="super-panel-heading" role="status">Loading system analytics...</p></div>
    const highestProgramCount = Math.max(1, ...analytics.programsByDepartment.map((item) => item.count))

    return (
      <>
        <section className="super-analytics-metrics"><article><span>USER ACCOUNTS</span><strong>{analytics.users.total}</strong><small>{analytics.users.active} active · {analytics.users.inactive} inactive</small></article><article><span>ACADEMIC UNITS</span><strong>{analytics.departments + analytics.programs}</strong><small>{analytics.departments} departments · {analytics.programs} programs</small></article><article><span>CAMPUS CAPACITY</span><strong>{analytics.rooms.capacity}</strong><small>seats across {analytics.rooms.active} active rooms</small></article><article><span>AUDIT EVENTS</span><strong>{analytics.auditEvents}</strong><small>tracked system actions</small></article></section>
        <section className="super-panel analytics-panel"><div className="super-panel-heading"><div><p className="super-kicker">ACADEMIC STRUCTURE</p><h2>Programs by department</h2><p>Program counts based on the current system directory.</p></div><span className="analytics-period">CURRENT DIRECTORY</span></div><div className="analytics-chart" role="img" aria-label="Bar chart of programs by department">{analytics.programsByDepartment.map((item) => <div className="analytics-bar-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${(item.count / highestProgramCount) * 100}%` }} /></div><strong>{item.count}</strong></div>)}</div></section>
      </>
    )
  }

  function renderAuditLog() {
    return (
      <section className="super-panel audit-panel"><div className="super-panel-heading"><div><p className="super-kicker">ACCOUNTABILITY</p><h2>System audit log</h2><p>Recent administrative actions recorded for this session.</p></div><span className="audit-count">{auditLog.length} events</span></div><div className="super-table-scroll"><table className="super-table audit-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{auditLog.map((event) => <tr key={event.id}><td>{event.time}</td><td><strong>{event.actor}</strong></td><td>{event.action}</td><td>{event.target}</td><td>{event.details}</td></tr>)}</tbody></table></div></section>
    )
  }

  const activeDefinition = entityDefinitions[activeView]

  if (loading) {
    return <main className="dashboard-page super-admin-page"><div className="super-dashboard-content" role="status">Loading system workspace...</div></main>
  }

  return (
    <main className="dashboard-page super-admin-page">
      <header className="dashboard-header">
        <a className="dashboard-brand" href="#super-admin-dashboard"><span>Timetable Allocation<br />&amp; Management</span></a>
        <div className="dashboard-account"><div className="account-copy"><span>Super Admin</span><strong>{session.identity}</strong></div><button className="sign-out-button" type="button" onClick={onSignOut}>Sign out</button></div>
      </header>
      <div className="super-dashboard-content" id="super-admin-dashboard">
        <section className="super-welcome"><div><p className="super-kicker">SYSTEM CONTROL CENTER</p><h1>Institution overview</h1><p>Manage campus operations, access, and system-wide activity.</p></div><span className="super-admin-badge">SUPER ADMIN</span></section>
        <nav className="super-tabs" aria-label="System administration sections">{navigationItems.map(([id, label]) => <button type="button" key={id} className={activeView === id ? 'is-active' : ''} aria-current={activeView === id ? 'page' : undefined} onClick={() => { setActiveView(id); setSearch(''); setSubjectFilters({ academicYearId: '', departmentId: '', programId: '', batchId: '', semesterId: '', type: '' }); setNotice('') }}>{label}</button>)}</nav>
        {notice && <p className="super-notice" role="status">{notice}</p>}
        {activeView === 'overview' && renderOverview()}
        {activeDefinition && renderEntityManager(activeView)}
        {activeView === 'faculty' && <FacultyManagementPage />}
        {activeView === 'request-forms' && <RequestFormFieldsPage />}
        {activeView === 'settings' && renderSettings()}
        {activeView === 'analytics' && renderAnalytics()}
        {activeView === 'audit' && renderAuditLog()}
      </div>

      {modal && (
        <div className="super-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}>
          <section className="super-modal" role="dialog" aria-modal="true" aria-labelledby="entity-modal-title">
            <div className="super-modal-heading">
              <div><p className="super-kicker">SYSTEM DIRECTORY</p><h2 id="entity-modal-title">{modal.record ? `Edit ${entityDefinitions[modal.entity].singular}` : `Add ${entityDefinitions[modal.entity].singular}`}</h2></div>
              <button type="button" className="super-modal-close" aria-label="Close dialog" onClick={() => setModal(null)}>×</button>
            </div>
            <form className="super-entity-form" onSubmit={saveRecord}>
              {entityDefinitions[modal.entity].fields.map((field) => renderEntityField(field, modal.record, formValues))}
              {modal.entity === 'users' && <label>Initial password<input name="password" type="password" autoComplete="new-password" minLength="8" required={!modal.record} /></label>}
              <div className="super-modal-actions">
                <button className="super-secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button>
                <button className="super-primary-button" type="submit">{modal.record ? 'Save changes' : `Add ${entityDefinitions[modal.entity].singular}`}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default SuperAdminDashboardPage