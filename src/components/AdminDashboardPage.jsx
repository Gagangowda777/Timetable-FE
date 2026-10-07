import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import ManualTimetablePage from './ManualTimetablePage.jsx'
import './AdminDashboardPage.css'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function resequenceSlots(slots, day) {
  const daySlots = slots.filter((slot) => slot.day === day)
    .sort((left, right) => left.sequence - right.sequence || left.start.localeCompare(right.start))
  const sequences = new Map(daySlots.map((slot, index) => [slot.id, index + 1]))
  return slots.map((slot) => sequences.has(slot.id) ? { ...slot, sequence: sequences.get(slot.id) } : slot)
}

function calendarFingerprint(days, slots) {
  return JSON.stringify({
    workingDays: [...days],
    timeSlots: [...slots]
      .map(({ day, start, end, type, sequence, status }) => ({ day, start, end, type, sequence, status }))
      .sort((left, right) => weekdays.indexOf(left.day) - weekdays.indexOf(right.day)
        || left.sequence - right.sequence
        || left.start.localeCompare(right.start)),
  })
}

function AdminDashboardPage({ session, onSignOut }) {
  const isAcademicAdmin = session.role === 'academic-admin'
  const roleLabel = isAcademicAdmin ? 'Academic Admin' : 'Department Admin'
  const [activeView, setActiveView] = useState('overview')
  const [departments, setDepartments] = useState([])
  const [rooms, setRooms] = useState([])
  const [departmentId] = useState(session.departmentId)
  const [scheduleFilter, setScheduleFilter] = useState('All departments')
  const [scheduleView, setScheduleView] = useState('board')
  const [scheduleDay, setScheduleDay] = useState('All')
  const [scheduleStatus, setScheduleStatus] = useState('All')
  const [scheduleQuery, setScheduleQuery] = useState('')
  const [schedules, setSchedules] = useState([])
  const [faculty, setFaculty] = useState([])
  const [workloadReport, setWorkloadReport] = useState(null)
  const [workloadError, setWorkloadError] = useState('')
  const [conflicts, setConflicts] = useState([])
  const [workingDays, setWorkingDays] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [changeRequests, setChangeRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [scheduleConflicts, setScheduleConflicts] = useState([])
  const [approvalConflicts, setApprovalConflicts] = useState([])
  const [resolvingConflictId, setResolvingConflictId] = useState(null)
  const [notice, setNotice] = useState('')
  const [slotDayView, setSlotDayView] = useState('')
  const [savedCalendar, setSavedCalendar] = useState('')
  const calendarDirty = Boolean(savedCalendar) && calendarFingerprint(workingDays, timeSlots) !== savedCalendar

  useEffect(() => {
    let active = true
    apiRequest('/admin/bootstrap')
      .then((result) => {
        if (!active) return
        setDepartments(result.departments)
        setRooms(result.rooms)
        setSchedules(result.schedules)
        setFaculty(result.faculty)
        setConflicts(result.conflicts)
        setWorkingDays(result.workingDays)
        setTimeSlots(result.timeSlots)
        setSavedCalendar(calendarFingerprint(result.workingDays, result.timeSlots))
      })
      .catch((error) => {
        if (active) setNotice(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    apiRequest('/admin/change-requests')
      .then((result) => { if (active) setChangeRequests(result) })
      .catch((error) => { if (active) setNotice(error.message) })

    return () => { active = false }
  }, [reloadKey])

  useEffect(() => {
    if (activeView !== 'faculty-workload') return undefined
    let active = true
    apiRequest('/admin/faculty-workload')
      .then((result) => { if (active) { setWorkloadReport(result); setWorkloadError('') } })
      .catch((error) => { if (active) setWorkloadError(error.message) })
    return () => { active = false }
  }, [activeView, reloadKey])

  const department = departments.find((item) => item.id === departmentId)?.name || departments[0]?.name || 'Department'

  if (loading && !departments.length) {
    return <main className="dashboard-page admin-dashboard-page"><div className="admin-dashboard-content" role="status">Loading scheduling workspace...</div></main>
  }

  const tabs = isAcademicAdmin
    ? [['overview', 'Overview'], ['manual-timetable', 'Manual timetable'], ['schedules', 'Schedules'], ['faculty-workload', 'Faculty workload'], ['conflicts', 'Conflicts'], ['approvals', 'Approvals'], ['change-requests', 'Change requests'], ['settings', 'Working hours']]
    : [['overview', 'Overview'], ['manual-timetable', 'Manual timetable'], ['timetable', 'Timetable'], ['faculty', 'Faculty'], ['faculty-workload', 'Faculty workload'], ['conflicts', 'Conflicts'], ['approvals', 'Approvals'], ['change-requests', 'Change requests']]
  const visibleSchedules = schedules.filter((item) => {
    if (isAcademicAdmin) return scheduleFilter === 'All departments' || item.department === scheduleFilter
    return item.department === department
  })
  const visibleConflicts = conflicts.filter((item) => {
    return isAcademicAdmin || item.department === department
  })
  const pendingSchedules = visibleSchedules.filter((item) => item.status === 'Awaiting approval')
  const openConflicts = visibleConflicts.filter((item) => item.status === 'Open')
  const pendingChangeRequests = changeRequests.filter((item) => item.status === 'Pending')
  const visibleFaculty = faculty.filter((item) => isAcademicAdmin || item.department === department)
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const filteredSchedules = visibleSchedules.filter((item) => {
    if (scheduleDay !== 'All' && item.day !== scheduleDay) return false
    if (scheduleStatus !== 'All' && item.status !== scheduleStatus) return false
    const query = scheduleQuery.trim().toLowerCase()
    if (query) {
      const haystack = [item.subject, item.code, item.faculty, item.room, item.department, item.day, item.status]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
  const scheduleStatusOptions = [...new Set(visibleSchedules.map((item) => item.status))].sort()
  const boardDays = weekdays.filter((day) => workingDays.includes(day))
  const scheduleFiltersActive = scheduleDay !== 'All' || scheduleStatus !== 'All' || scheduleQuery.trim() !== ''

  async function updateScheduleStatus(ids, status, details = {}) {
    setApprovalConflicts([])
    try {
      await apiRequest('/admin/schedules/status', { method: 'PATCH', body: { ids, status, ...details } })
      const messages = {
        'Awaiting approval': 'Timetable submitted for review.',
        'Under review': 'Timetable review started.',
        Approved: 'Timetable approved.',
        Rejected: 'Timetable rejected.',
        'Returned for changes': 'Timetable returned for changes.',
        Published: 'Timetable published.',
      }
      setNotice(messages[status] || `Timetable status changed to ${status}.`)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
      setApprovalConflicts(error.conflicts || [])
    }
  }

  async function createSchedule(event) {
    event.preventDefault()
    setScheduleConflicts([])
    const formData = new FormData(event.currentTarget)
    const subject = formData.get('subject')
    try {
      const result = await apiRequest('/admin/schedules', {
        method: 'POST',
        body: {
          departmentId,
          day: formData.get('day'),
          start: formData.get('start'),
          end: formData.get('end'),
          subject,
          code: formData.get('code'),
          facultyId: Number(formData.get('facultyId')),
          roomId: Number(formData.get('roomId')),
          group: formData.get('group'),
        },
      })
      setIsCreateOpen(false)
      setNotice(result.conflictsCreated
        ? `${subject} was added as a draft. ${result.conflictsCreated} scheduling conflicts need review.`
        : `${subject} was added to the ${department} draft timetable.`)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
      setScheduleConflicts(error.conflicts || [])
    }
  }

  async function toggleFacultyAvailability(id, available) {
    try {
      await apiRequest(`/admin/faculty/${id}/availability`, { method: 'PATCH', body: { available: !available } })
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function resolveConflict(id) {
    setResolvingConflictId(id)
    try {
      const result = await apiRequest(`/admin/conflicts/${id}/resolve`, { method: 'PATCH' })
      setNotice(result.message || 'Scheduling conflict resolved.')
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setResolvingConflictId(null)
    }
  }

  async function reviewChangeRequest(id, status) {
    try {
      await apiRequest(`/admin/change-requests/${id}`, { method: 'PATCH', body: { status } })
      setNotice(`Timetable change request ${status.toLowerCase()}.`)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice(error.message)
    }
  }

  function toggleWorkingDay(day) {
    setWorkingDays((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day])
  }

  function updateTimeSlot(id, key, value) {
    setTimeSlots((current) => {
      const changedSlot = current.find((slot) => slot.id === id)
      if (key !== 'day' || !changedSlot || changedSlot.day === value) {
        return current.map((slot) => slot.id === id ? { ...slot, [key]: value } : slot)
      }
      const changed = current.map((slot) => slot.id === id
        ? { ...slot, day: value, sequence: current.filter((item) => item.day === value).length + 1 }
        : slot)
      return resequenceSlots(resequenceSlots(changed, changedSlot.day), value)
    })
  }

  function addTimeSlot(day) {
    const targetDay = weekdays.includes(day) ? day : (workingDays[0] || weekdays[0])
    setTimeSlots((current) => [...current, {
      id: `new-${Date.now()}`,
      day: targetDay,
      start: '14:00',
      end: '15:00',
      type: 'CLASS',
      sequence: current.filter((slot) => slot.day === targetDay).length + 1,
      status: 'Active',
    }])
    setSlotDayView(targetDay)
  }

  function moveTimeSlot(id, direction) {
    setTimeSlots((current) => {
      const slot = current.find((item) => item.id === id)
      if (!slot) return current
      const daySlots = current.filter((item) => item.day === slot.day).sort((left, right) => left.sequence - right.sequence)
      const index = daySlots.findIndex((item) => item.id === id)
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= daySlots.length) return current
      const slotToMove = daySlots[index]
      daySlots[index] = daySlots[nextIndex]
      daySlots[nextIndex] = slotToMove
      const sequences = new Map(daySlots.map((item, slotIndex) => [item.id, slotIndex + 1]))
      return current.map((item) => sequences.has(item.id) ? { ...item, sequence: sequences.get(item.id) } : item)
    })
  }

  function removeTimeSlot(id) {
    setTimeSlots((current) => {
      const removed = current.find((slot) => slot.id === id)
      if (!removed) return current
      return resequenceSlots(current.filter((slot) => slot.id !== id), removed.day)
    })
  }

  async function saveCalendar() {
    try {
      const calendar = await apiRequest('/admin/calendar', {
        method: 'PUT',
        body: { workingDays, timeSlots: timeSlots.map(({ id, day, start, end, type, sequence, status }) => ({ id, day, start, end, type, sequence, status })) },
      })
      setWorkingDays(calendar.workingDays)
      setTimeSlots(calendar.timeSlots)
      setSavedCalendar(calendarFingerprint(calendar.workingDays, calendar.timeSlots))
      setNotice('Institution working days and time slots have been saved.')
    } catch (error) {
      setNotice(error.message)
    }
  }

  function resetScheduleFilters() {
    setScheduleDay('All')
    setScheduleStatus('All')
    setScheduleQuery('')
  }

  function renderScheduleEmpty(message) {
    return (
      <div className="admin-empty-state schedule-empty" role="status">
        <span>{message}</span>
        {scheduleFiltersActive && <button type="button" onClick={resetScheduleFilters}>Clear filters</button>}
      </div>
    )
  }

  function renderScheduleToolbar({ search = true, status = false, view = false } = {}) {
    return (
      <div className="schedule-toolbar">
        <div className="schedule-day-chips" role="group" aria-label="Filter schedules by day">
          <button type="button" className={scheduleDay === 'All' ? 'is-active' : ''} aria-pressed={scheduleDay === 'All'} onClick={() => setScheduleDay('All')}>All days</button>
          {boardDays.map((day) => (
            <button type="button" key={day} className={scheduleDay === day ? 'is-active' : ''} aria-pressed={scheduleDay === day} onClick={() => setScheduleDay(day)}>
              {day.slice(0, 3)}{day === todayName && <i className="today-dot" aria-hidden="true" title="Today" />}
            </button>
          ))}
        </div>
        <div className="schedule-toolbar-controls">
          {status && (
            <select aria-label="Filter schedules by status" value={scheduleStatus} onChange={(event) => setScheduleStatus(event.target.value)}>
              <option value="All">All statuses</option>
              {scheduleStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          )}
          {search && (
            <input className="schedule-search" type="search" aria-label="Search schedules" placeholder="Search subject, faculty, room..." value={scheduleQuery} onChange={(event) => setScheduleQuery(event.target.value)} />
          )}
          {view && (
            <div className="schedule-view-toggle" role="group" aria-label="Timetable view">
              <button type="button" className={scheduleView === 'board' ? 'is-active' : ''} aria-pressed={scheduleView === 'board'} onClick={() => setScheduleView('board')}>Week</button>
              <button type="button" className={scheduleView === 'list' ? 'is-active' : ''} aria-pressed={scheduleView === 'list'} onClick={() => setScheduleView('list')}>List</button>
            </div>
          )}
          <span className="schedule-result-count">{filteredSchedules.length} of {visibleSchedules.length} classes</span>
        </div>
      </div>
    )
  }

  function scheduleStatusTone(status) {
    if (status === 'Published') return 'published'
    if (status === 'Approved') return 'approved'
    if (status === 'Rejected') return 'rejected'
    if (status === 'Draft') return 'draft'
    return 'pending'
  }

  function renderScheduleBoard() {
    if (!filteredSchedules.length) return renderScheduleEmpty(visibleSchedules.length ? 'No classes match the current filters.' : 'No schedules have been created yet.')
    return (
      <div className="schedule-board-scroll">
        <div
          className="schedule-board"
          style={{ gridTemplateColumns: `repeat(${boardDays.length}, minmax(190px, 1fr))`, minWidth: `${boardDays.length * 202}px` }}
        >
          {boardDays.map((day) => {
            const dayItems = filteredSchedules.filter((item) => item.day === day)
              .sort((left, right) => left.start.localeCompare(right.start))
            const isToday = day === todayName
            return (
              <section className={`schedule-board-day${isToday ? ' is-today' : ''}`} key={day} aria-label={day}>
                <header className="schedule-board-day-heading">
                  <strong>{day}</strong>
                  <span>{dayItems.length} {dayItems.length === 1 ? 'class' : 'classes'}{isToday ? ' · Today' : ''}</span>
                </header>
                <div className="schedule-board-items">
                  {dayItems.length ? dayItems.map((item) => (
                    <article className={`schedule-board-card schedule-board-card--${scheduleStatusTone(item.status)}`} key={item.id}>
                      <div className="schedule-board-card-time"><strong>{item.start}</strong><span>–{item.end}</span></div>
                      <div className="schedule-board-card-body">
                        <strong>{item.subject}</strong>
                        <span className="schedule-board-card-meta">{item.code}{isAcademicAdmin && item.department ? ` · ${item.department}` : ''}</span>
                        <small>{item.faculty} · {item.room}</small>
                      </div>
                      <span className="schedule-board-card-status">{item.status}</span>
                    </article>
                  )) : <p className="schedule-board-empty">{scheduleFiltersActive ? 'No matching classes' : 'No classes scheduled'}</p>}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  function renderScheduleTable() {
    if (!filteredSchedules.length) return renderScheduleEmpty(visibleSchedules.length ? 'No classes match the current filters.' : 'No schedules have been created yet.')
    return (
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Day &amp; time</th>
              <th>Subject</th>
              {isAcademicAdmin && <th>Department</th>}
              <th>Faculty</th>
              <th>Room</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedules.map((item) => (
              <tr key={item.id} className={item.day === todayName ? 'schedule-row-today' : ''}>
                <td><strong>{item.day}</strong><span>{item.start}–{item.end}</span></td>
                <td><strong>{item.subject}</strong><span>{item.code}</span></td>
                {isAcademicAdmin && <td>{item.department}</td>}
                <td>{item.faculty}</td>
                <td>{item.room}</td>
                <td><span className={`status-pill status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderOverview() {
    const metrics = [
      { label: isAcademicAdmin ? 'INSTITUTION SCHEDULES' : 'DEPARTMENT CLASSES', value: visibleSchedules.length, note: 'scheduled entries', target: isAcademicAdmin ? 'schedules' : 'timetable' },
      { label: 'NEEDS APPROVAL', value: pendingSchedules.length, note: 'awaiting review', target: 'approvals' },
      { label: 'OPEN CONFLICTS', value: openConflicts.length, note: 'need resolution', target: 'conflicts' },
      { label: 'FACULTY AVAILABLE', value: `${visibleFaculty.filter((item) => item.available).length}/${visibleFaculty.length}`, note: 'availability status', target: isAcademicAdmin ? null : 'faculty' },
    ]
    function goToView(target) {
      if (!target) return
      setActiveView(target)
      setNotice('')
    }
    return (
      <>
        <section className="admin-metrics" aria-label="Scheduling summary">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className={metric.target ? 'is-interactive' : ''}
              {...(metric.target ? {
                role: 'button',
                tabIndex: 0,
                onClick: () => goToView(metric.target),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    goToView(metric.target)
                  }
                },
              } : {})}
            >
              <span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small>
              {metric.target && <i className="admin-metric-arrow" aria-hidden="true">→</i>}
            </article>
          ))}
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><p className="admin-kicker">SCHEDULE OVERVIEW</p><h2>{isAcademicAdmin ? 'Institution timetable' : `${department} timetable`}</h2></div>
            <button className="admin-text-action" type="button" onClick={() => setActiveView(isAcademicAdmin ? 'schedules' : 'timetable')}>View all schedules <span aria-hidden="true">→</span></button>
          </div>
          {renderScheduleToolbar({ status: false, view: false })}
          {renderScheduleTable()}
        </section>
        <section className="admin-quick-actions" aria-label="Scheduling actions">
          {isAcademicAdmin ? (
            <>
              <button type="button" onClick={() => setActiveView('conflicts')}><span>01</span><strong>Resolve conflicts</strong><small>{openConflicts.length} open items</small></button>
              <button type="button" onClick={() => setActiveView('settings')}><span>02</span><strong>Configure working hours</strong><small>{workingDays.length} active days · {timeSlots.length} time slots</small></button>
              <button type="button" onClick={() => setActiveView('change-requests')}><span>03</span><strong>Review change requests</strong><small>{pendingChangeRequests.length} pending requests</small></button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setIsCreateOpen(true)}><span>01</span><strong>Create timetable</strong><small>Assign course, faculty, and room</small></button>
              <button type="button" onClick={() => setActiveView('faculty')}><span>02</span><strong>Faculty availability</strong><small>Review teaching availability</small></button>
              <button type="button" onClick={() => setActiveView('approvals')}><span>03</span><strong>Review approvals</strong><small>{pendingSchedules.length} schedules to review</small></button>
            </>
          )}
        </section>
      </>
    )
  }

  function renderConflicts() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-kicker">SCHEDULE VALIDATION</p><h2>{isAcademicAdmin ? 'Cross-department conflicts' : 'Department conflicts'}</h2><p>Review each issue and mark it resolved when the schedule is updated.</p></div></div>
        {visibleConflicts.length ? (
          <div className="conflict-list">
            {visibleConflicts.map((item) => (
              <article className={`conflict-row${item.status === 'Resolved' ? ' is-resolved' : ''}`} key={item.id}>
                <span className="conflict-indicator" aria-hidden="true" />
                <div className="conflict-info"><div className="conflict-title"><strong>{item.type}</strong><span>{item.status}</span></div><p>{item.detail}</p><small>{item.day} · {item.time} · {item.schedules}</small></div>
                {item.status === 'Open' && (item.isCrossDepartment && !isAcademicAdmin
                  ? <span className="request-count" title="Cross-department conflicts are resolved by an Academic Admin">Academic admin only</span>
                  : <button className="admin-secondary-button" type="button" disabled={resolvingConflictId === item.id} onClick={() => resolveConflict(item.id)}>{resolvingConflictId === item.id ? 'Applying fix…' : 'Resolve'}</button>)}
              </article>
            ))}
          </div>
        ) : <div className="admin-empty-state">No conflicts in this schedule.</div>}
      </section>
    )
  }

  function renderApprovals() {
    const approvalItems = visibleSchedules.filter((item) => isAcademicAdmin
      ? ['Awaiting approval', 'Under review'].includes(item.status)
      : ['Draft', 'Returned for changes', 'Approved'].includes(item.status))

    function requestReviewAction(item, status) {
      if (status === 'Rejected') {
        const rejectionReason = window.prompt('Enter the rejection reason:')
        if (!rejectionReason?.trim()) return
        updateScheduleStatus([item.id], status, { rejectionReason })
      } else if (status === 'Returned for changes') {
        const reviewComments = window.prompt('Describe the changes required:')
        if (!reviewComments?.trim()) return
        updateScheduleStatus([item.id], status, { reviewComments })
      } else {
        updateScheduleStatus([item.id], status)
      }
    }

    return (
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-kicker">SCHEDULE GOVERNANCE</p><h2>{isAcademicAdmin ? 'Timetable review' : 'Department timetable lifecycle'}</h2><p>{isAcademicAdmin ? 'Review submitted timetables, then approve, reject, or return them.' : 'Submit drafts, revise returned timetables, or publish approved timetables.'}</p></div></div>
        {approvalConflicts.length > 0 && <ul className="schedule-conflict-list" role="alert">{approvalConflicts.map((item, index) => <li key={`${item.type}-${item.entryId ?? index}`}><strong>{item.type.replaceAll('_', ' ')}</strong><span>{item.message}</span></li>)}</ul>}
        {approvalItems.length ? (
          <div className="approval-list">
            {approvalItems.map((item) => (
              <article className="approval-row" key={item.id}>
                <div>
                  <strong>{item.department}</strong>
                  <span>{item.subject} · {item.day}, {item.start} · {item.room}</span>
                  {item.submittedAt && <small>Submitted by {item.submittedBy || 'Administrator'} · {new Date(item.submittedAt).toLocaleString()}</small>}
                  {item.reviewedAt && <small>Reviewed by {item.reviewedBy || 'Administrator'} · {new Date(item.reviewedAt).toLocaleString()}</small>}
                  {item.approvedAt && <small>Approved by {item.approvedBy || 'Administrator'} · {new Date(item.approvedAt).toLocaleString()}</small>}
                  {item.rejectionReason && <small className="approval-review-note">Rejection reason: {item.rejectionReason}</small>}
                  {item.reviewComments && <small className="approval-review-note">Review comments: {item.reviewComments}</small>}
                </div>
                <div className="approval-row-actions">
                  <span className={`status-pill status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span>
                  {isAcademicAdmin && item.status === 'Awaiting approval' && <button className="admin-secondary-button" type="button" onClick={() => requestReviewAction(item, 'Under review')}>Review</button>}
                  {isAcademicAdmin && item.status === 'Under review' && <>
                    <button className="admin-primary-button" type="button" onClick={() => requestReviewAction(item, 'Approved')}>Approve</button>
                    <button className="admin-secondary-button" type="button" onClick={() => requestReviewAction(item, 'Returned for changes')}>Return for changes</button>
                    <button className="admin-secondary-button" type="button" onClick={() => requestReviewAction(item, 'Rejected')}>Reject</button>
                  </>}
                  {!isAcademicAdmin && ['Draft', 'Returned for changes'].includes(item.status) && <button className="admin-secondary-button" type="button" onClick={() => updateScheduleStatus([item.id], 'Awaiting approval')}>Submit</button>}
                  {!isAcademicAdmin && item.status === 'Approved' && <button className="admin-primary-button" type="button" onClick={() => updateScheduleStatus([item.id], 'Published')}>Publish</button>}
                </div>
              </article>
            ))}
          </div>
        ) : <div className="admin-empty-state">No timetables are awaiting action.</div>}
      </section>
    )
  }

  function renderFaculty() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-kicker">FACULTY PLANNING</p><h2>Faculty availability</h2><p>Update availability before assigning teaching sessions.</p></div></div>
        <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Faculty member</th><th>Department</th><th>Available days</th><th>Availability</th></tr></thead><tbody>
          {visibleFaculty.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.department}</td><td>{item.days}</td><td><button className={`availability-toggle${item.available ? ' is-available' : ''}`} type="button" aria-pressed={item.available} onClick={() => toggleFacultyAvailability(item.id, item.available)}><i />{item.available ? 'Available' : 'Unavailable'}</button></td></tr>)}
        </tbody></table></div>
      </section>
    )
  }

  function renderFacultyWorkload() {
    if (workloadError) return <section className="admin-panel"><p className="admin-notice" role="alert">{workloadError}</p></section>
    if (!workloadReport) return <section className="admin-panel"><p className="admin-empty-state" role="status">Loading faculty workload...</p></section>
    const { faculty: facultyWorkloads, overloadedFaculty } = workloadReport
    return (
      <>
        <section className="admin-panel workload-panel">
          <div className="admin-panel-heading"><div><p className="admin-kicker">CAPACITY WATCH</p><h2>Overloaded faculty</h2><p>Published weekly hours exceed the configured teaching maximum.</p></div></div>
          {overloadedFaculty.length ? <ul className="overloaded-faculty-list">{overloadedFaculty.map((item) => <li key={item.facultyId}><strong>{item.faculty}</strong><span>{item.department} · {item.weeklyTeachingHours} / {item.maximumAllowedHours} h · {item.utilizationPercentage}%</span></li>)}</ul> : <div className="admin-empty-state">No faculty are over their configured teaching hours.</div>}
        </section>
        <section className="admin-panel workload-panel">
          <div className="admin-panel-heading"><div><p className="admin-kicker">PUBLISHED TIMETABLE</p><h2>Faculty workload</h2><p>Hours and class counts are calculated from published entries only.</p></div></div>
          <div className="admin-table-scroll"><table className="admin-table workload-table"><thead><tr><th>Faculty member</th><th>Department</th><th>Weekly hours</th><th>Daily hours</th><th>Classes</th><th>Maximum</th><th>Utilization</th><th>Load</th></tr></thead><tbody>
            {facultyWorkloads.map((item) => <tr key={item.facultyId}>
              <td><strong>{item.faculty}</strong><span>{item.email}</span></td><td>{item.department}</td><td>{item.weeklyTeachingHours} h</td>
              <td>{item.dailyTeachingHours.filter((day) => day.hours > 0).map((day) => `${day.day.slice(0, 3)} ${day.hours}`).join(' · ') || 'No classes'}</td>
              <td>{item.numberOfClasses}</td><td>{item.maximumAllowedHours} h</td><td>{item.utilizationPercentage}%</td>
              <td><span className={`status-pill workload-${item.workloadStatus.toLowerCase().replaceAll(' ', '-')}`}>{item.workloadStatus}</span></td>
            </tr>)}
            {!facultyWorkloads.length && <tr><td className="admin-empty-state" colSpan="8">No active faculty records.</td></tr>}
          </tbody></table></div>
        </section>
      </>
    )
  }

  function renderChangeRequests() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-kicker">FACULTY SCHEDULE SUPPORT</p><h2>Timetable change requests</h2><p>Review requested changes to assigned classes and labs.</p></div><span className="request-count">{pendingChangeRequests.length} pending</span></div>
        {changeRequests.length ? (
          <div className="admin-table-scroll"><table className="admin-table change-request-table"><thead><tr><th>Faculty member</th><th>Assigned class</th><th>Current time</th><th>Requested change</th><th>Reason</th><th>Status</th><th>Review</th></tr></thead><tbody>
            {changeRequests.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.facultyName}</strong></td>
                <td><strong>{item.subject}</strong><span>{item.code}</span></td>
                <td>{item.day}<span>{item.start}–{item.end}</span></td>
                <td className="change-request-copy">{item.proposedChange}</td>
                <td className="change-request-copy">{item.reason}</td>
                <td><span className={`request-status is-${item.status.toLowerCase()}`}>{item.status}</span></td>
                <td>{item.status === 'Pending' ? <div className="request-review-actions"><button type="button" onClick={() => reviewChangeRequest(item.id, 'Approved')}>Approve</button><button type="button" onClick={() => reviewChangeRequest(item.id, 'Declined')}>Decline</button></div> : item.reviewedBy || 'Reviewed'}</td>
              </tr>
            ))}
          </tbody></table></div>
        ) : <div className="admin-empty-state">No faculty change requests have been submitted.</div>}
      </section>
    )
  }

  function renderSettings() {
    const orderedSlots = [...timeSlots].sort((left, right) => weekdays.indexOf(left.day) - weekdays.indexOf(right.day)
      || left.sequence - right.sequence)
    const countSlotsFor = (day) => orderedSlots.filter((slot) => slot.day === day).length
    const daysWithSlots = weekdays.filter((day) => countSlotsFor(day) > 0)
    const activeSlotDay = weekdays.includes(slotDayView)
      ? slotDayView
      : (daysWithSlots.includes(todayName) ? todayName : daysWithSlots[0] || workingDays[0] || weekdays[0])
    const daySlots = orderedSlots.filter((slot) => slot.day === activeSlotDay)
    const classSlots = orderedSlots.filter((slot) => slot.type === 'CLASS')
    function moveSlotToDay(id, day) {
      updateTimeSlot(id, 'day', day)
      setSlotDayView(day)
    }
    const dailySpan = classSlots.length
      ? `${classSlots.map((slot) => slot.start).sort()[0]}–${classSlots.map((slot) => slot.end).sort().at(-1)}`
      : 'No class periods'
    return (
      <section className="admin-panel settings-panel">
        <div className="admin-panel-heading">
          <div><p className="admin-kicker">INSTITUTION CALENDAR</p><h2>Working days &amp; time slots</h2><p>Set the days and teaching periods available to every department.</p></div>
          <div className="settings-summary-chips" aria-label="Calendar summary"><span>{workingDays.length} active days</span><span>{timeSlots.length} time slots</span><span>{dailySpan}</span></div>
        </div>
        <div className="settings-grid">
          <div className="settings-block settings-block-days">
            <div className="settings-block-heading"><h3>Working days</h3></div>
            <p className="settings-hint">Days classes can be scheduled on. Untick a day to hide it from every timetable view.</p>
            <div className="working-day-options">
              {weekdays.map((day) => {
                const isEnabled = workingDays.includes(day)
                const slotCount = orderedSlots.filter((slot) => slot.day === day).length
                return (
                  <label className={`working-day-card${isEnabled ? ' is-on' : ''}`} key={day}>
                    <input type="checkbox" checked={isEnabled} onChange={() => toggleWorkingDay(day)} />
                    <span className="working-day-tick" aria-hidden="true">✓</span>
                    <span className="working-day-name">{day}</span>
                    <span className="working-day-meta">{slotCount ? `${slotCount} slot${slotCount === 1 ? '' : 's'}` : 'No slots'}</span>
                  </label>
                )
              })}
            </div>
          </div>
          <div className="settings-block settings-block-slots">
            <div className="time-slots-heading">
              <div><h3>Time slots</h3><p className="settings-hint">Choose a day, then edit its periods or reorder them with the arrows.</p></div>
              <button className="admin-secondary-button" type="button" onClick={() => addTimeSlot(activeSlotDay)}>Add time slot</button>
            </div>
            <div className="slot-day-tabs" role="tablist" aria-label="Days of the week">
              {weekdays.map((day) => {
                const slotCount = countSlotsFor(day)
                const isActive = day === activeSlotDay
                return (
                  <button
                    className={`slot-day-tab${isActive ? ' is-active' : ''}${workingDays.includes(day) ? '' : ' is-off'}`}
                    type="button"
                    role="tab"
                    key={day}
                    id={`slot-tab-${day}`}
                    aria-selected={isActive}
                    aria-controls="slot-day-panel"
                    aria-label={`${day}, ${slotCount} slot${slotCount === 1 ? '' : 's'}`}
                    onClick={() => setSlotDayView(day)}
                  >
                    <strong>{day.slice(0, 3)}</strong>
                    <span>{slotCount || '–'}</span>
                  </button>
                )
              })}
            </div>
            <section className="slot-day-panel" role="tabpanel" id="slot-day-panel" aria-labelledby={`slot-tab-${activeSlotDay}`}>
              <header className="slot-day-heading">
                <strong>{activeSlotDay}</strong>
                <span>{daySlots.length} period{daySlots.length === 1 ? '' : 's'}{activeSlotDay === todayName ? ' · Today' : ''}</span>
                {!workingDays.includes(activeSlotDay) && <em>Not a working day</em>}
              </header>
              {daySlots.length ? (
                <div className="slot-card-grid">
                  {daySlots.map((slot, slotIndex) => (
                    <article className={`slot-card slot-card--${slot.type.toLowerCase()}${slot.status === 'Inactive' ? ' is-inactive' : ''}`} key={slot.id}>
                      <header className="slot-card-head">
                        <span className="slot-card-index" aria-hidden="true">{String(slot.sequence).padStart(2, '0')}</span>
                        <span className="slot-card-time">
                          <input aria-label={`${slot.day} slot ${slot.sequence} start time`} type="time" value={slot.start} onChange={(event) => updateTimeSlot(slot.id, 'start', event.target.value)} />
                          <em aria-hidden="true">–</em>
                          <input aria-label={`${slot.day} slot ${slot.sequence} end time`} type="time" value={slot.end} onChange={(event) => updateTimeSlot(slot.id, 'end', event.target.value)} />
                        </span>
                        <div className="slot-card-actions"><button type="button" aria-label={`Move ${slot.day} slot ${slot.sequence} up`} title="Move up" disabled={slotIndex === 0} onClick={() => moveTimeSlot(slot.id, -1)}>↑</button><button type="button" aria-label={`Move ${slot.day} slot ${slot.sequence} down`} title="Move down" disabled={slotIndex === daySlots.length - 1} onClick={() => moveTimeSlot(slot.id, 1)}>↓</button><button type="button" aria-label={`Remove ${slot.day} slot ${slot.sequence}`} title="Remove slot" onClick={() => removeTimeSlot(slot.id)}>×</button></div>
                      </header>
                      <div className="slot-card-meta">
                        <label className="slot-card-field slot-card-type"><span>Type</span><select aria-label={`${slot.day} slot ${slot.sequence} type`} value={slot.type} onChange={(event) => updateTimeSlot(slot.id, 'type', event.target.value)}><option>CLASS</option><option>BREAK</option><option>LUNCH</option></select></label>
                        <label className="slot-card-field slot-card-status"><span>Status</span><select aria-label={`${slot.day} slot ${slot.sequence} status`} value={slot.status} onChange={(event) => updateTimeSlot(slot.id, 'status', event.target.value)}><option>Active</option><option>Inactive</option></select></label>
                        <label className="slot-card-field slot-card-move"><span>Day</span><select aria-label={`Move slot ${slot.sequence} to another day`} value={slot.day} onChange={(event) => moveSlotToDay(slot.id, event.target.value)}>{weekdays.map((dayOption) => <option key={dayOption} value={dayOption}>{dayOption.slice(0, 3)}</option>)}</select></label>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="slot-day-empty">
                  <p>No time slots on {activeSlotDay} yet.</p>
                  <button className="admin-secondary-button" type="button" onClick={() => addTimeSlot(activeSlotDay)}>Add the first slot</button>
                </div>
              )}
            </section>
          </div>
        </div>
        <div className="settings-save-bar">
          <p className={calendarDirty ? 'is-dirty' : ''}><i aria-hidden="true" />{calendarDirty ? 'Unsaved changes — save to apply them to every timetable.' : 'Everything is saved. Changes apply once saved.'}</p>
          <button className="admin-primary-button" type="button" onClick={saveCalendar}>Save institution hours</button>
        </div>
      </section>
    )
  }

  return (
    <main className="dashboard-page admin-dashboard-page">
      <header className="dashboard-header">
        <a className="dashboard-brand" href="#admin-dashboard"><span>Timetable Allocation<br />&amp; Management</span></a>
        <div className="dashboard-account"><div className="account-copy"><span>{roleLabel}</span><strong>{session.identity}</strong></div><button className="sign-out-button" type="button" onClick={onSignOut}>Sign out</button></div>
      </header>
      <div className="admin-dashboard-content" id="admin-dashboard">
        <section className="admin-welcome"><div><p className="admin-kicker">SCHEDULING WORKSPACE · {roleLabel.toUpperCase()}</p><h1>{isAcademicAdmin ? 'Institution scheduling' : 'Department scheduling'}</h1><p>{isAcademicAdmin ? 'Coordinate schedules, standards, and approvals across departments.' : 'Build and review your department’s teaching timetable.'}</p></div><span className="admin-demo-badge">LIVE WORKSPACE</span></section>
        <nav className="admin-tabs" aria-label="Admin dashboard sections">{tabs.map(([id, label]) => <button className={activeView === id ? 'is-active' : ''} type="button" key={id} aria-current={activeView === id ? 'page' : undefined} onClick={() => { setActiveView(id); setNotice('') }}>{label}{id === 'conflicts' && openConflicts.length > 0 && <span>{openConflicts.length}</span>}{id === 'change-requests' && pendingChangeRequests.length > 0 && <span>{pendingChangeRequests.length}</span>}</button>)}</nav>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {activeView === 'overview' && renderOverview()}
        {activeView === 'manual-timetable' && <ManualTimetablePage session={session} />}
        {(activeView === 'timetable' || activeView === 'schedules') && <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-kicker">{isAcademicAdmin ? 'INSTITUTION-WIDE SCHEDULING' : 'COURSE & RESOURCE ALLOCATION'}</p><h2>{isAcademicAdmin ? 'All department schedules' : `${department} timetable`}</h2><p>{isAcademicAdmin ? 'Review teaching schedules across all departments.' : 'Assign subjects, faculty, and rooms to each teaching slot.'}</p></div><div className="schedule-actions">{isAcademicAdmin && <select aria-label="Filter by department" value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value)}><option>All departments</option>{departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select>}{!isAcademicAdmin && <button className="admin-primary-button" type="button" onClick={() => setIsCreateOpen(true)}>Create timetable</button>}</div></div>{renderScheduleToolbar({ status: true, view: true })}{scheduleView === 'board' ? renderScheduleBoard() : renderScheduleTable()}</section>}
        {activeView === 'faculty' && renderFaculty()}
        {activeView === 'faculty-workload' && renderFacultyWorkload()}
        {activeView === 'change-requests' && renderChangeRequests()}
        {activeView === 'conflicts' && renderConflicts()}
        {activeView === 'approvals' && renderApprovals()}
        {activeView === 'settings' && renderSettings()}
      </div>

      {isCreateOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false) }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="create-timetable-heading">
            <div className="admin-modal-heading"><div><p className="admin-kicker">{department.toUpperCase()}</p><h2 id="create-timetable-heading">Create timetable entry</h2></div><button type="button" className="admin-modal-close" aria-label="Close dialog" onClick={() => setIsCreateOpen(false)}>×</button></div>
            <form className="admin-create-form" onSubmit={createSchedule}>
              <label>Subject<input name="subject" placeholder="e.g. Software Engineering" required /></label>
              <label>Course code<input name="code" placeholder="e.g. CSC 402" required /></label>
              <label>Faculty<select name="facultyId" required>{faculty.filter((item) => item.department === department).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Room<select name="roomId" required>{rooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.campus}</option>)}</select></label>
              <label>Student group<input name="group" placeholder="e.g. Year 2 · Group A" /></label>
              <label>Day<select name="day">{weekdays.slice(0, 5).map((day) => <option key={day}>{day}</option>)}</select></label>
              <div className="create-time-fields"><label>Start time<input name="start" type="time" defaultValue="08:00" required /></label><label>End time<input name="end" type="time" defaultValue="09:00" required /></label></div>
              {scheduleConflicts.length > 0 && <ul className="schedule-conflict-list" role="alert">{scheduleConflicts.map((item, index) => <li key={`${item.type}-${item.existingEntryId ?? index}`}><strong>{item.type.replaceAll('_', ' ')}</strong><span>{item.message}</span></li>)}</ul>}
              <div className="admin-modal-actions"><button className="admin-secondary-button" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</button><button className="admin-primary-button" type="submit">Add to draft timetable</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default AdminDashboardPage