import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiRequest } from '../api.js'
import './DashboardPage.css'

function formatDate(date, options) {
  return new Intl.DateTimeFormat('en', options).format(date)
}

function DashboardPage({ session, onSignOut }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeSection, setActiveSection] = useState('today')
  const [timetable, setTimetable] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notificationError, setNotificationError] = useState('')
  const [changeRequests, setChangeRequests] = useState([])
  const [changeRequestError, setChangeRequestError] = useState('')
  const [changeRequestNotice, setChangeRequestNotice] = useState('')
  const [facultyWorkload, setFacultyWorkload] = useState(null)
  const [facultyWorkloadError, setFacultyWorkloadError] = useState('')
  const [submittingChangeRequest, setSubmittingChangeRequest] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leaveRequestError, setLeaveRequestError] = useState('')
  const [leaveRequestNotice, setLeaveRequestNotice] = useState('')
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedDetail, setSelectedDetail] = useState(null) // { type: 'day'|'class', data }

  useEffect(() => {
    let active = true
    apiRequest(`/dashboard/timetable?weekOffset=${weekOffset}`)
      .then((result) => {
        if (active) {
          setTimetable(result)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [weekOffset, reloadKey])

  useEffect(() => {
    if (session.role !== 'student') return undefined
    let active = true
    const refreshNotifications = () => apiRequest('/dashboard/notifications')
      .then((result) => { if (active) setNotifications(result.notifications) })
      .catch((requestError) => { if (active) setNotificationError(requestError.message) })

    refreshNotifications()
    const interval = window.setInterval(refreshNotifications, 60000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [session.role])

  useEffect(() => {
    if (session.role !== 'faculty') return undefined
    let active = true
    apiRequest('/dashboard/change-requests')
      .then((result) => { if (active) setChangeRequests(result) })
      .catch((requestError) => { if (active) setChangeRequestError(requestError.message) })
    return () => { active = false }
  }, [session.role])

  useEffect(() => {
    if (session.role !== 'faculty') return undefined
    let active = true
    apiRequest('/dashboard/leave-requests')
      .then((result) => { if (active) setLeaveRequests(result) })
      .catch((requestError) => { if (active) setLeaveRequestError(requestError.message) })
    return () => { active = false }
  }, [session.role])

  useEffect(() => {
    if (session.role !== 'faculty') return undefined
    let active = true
    apiRequest('/dashboard/workload')
      .then((result) => { if (active) { setFacultyWorkload(result); setFacultyWorkloadError('') } })
      .catch((requestError) => { if (active) setFacultyWorkloadError(requestError.message) })
    return () => { active = false }
  }, [session.role, reloadKey])

  async function submitChangeRequest(event) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setSubmittingChangeRequest(true)
    setChangeRequestError('')
    setChangeRequestNotice('')
    try {
      const created = await apiRequest('/dashboard/change-requests', {
        method: 'POST',
        body: {
          scheduleId: Number(formData.get('scheduleId')),
          proposedChange: formData.get('proposedChange'),
          reason: formData.get('reason'),
        },
      })
      setChangeRequests((requests) => [created, ...requests])
      setChangeRequestNotice('Your timetable change request was submitted for review.')
      form.reset()
    } catch (requestError) {
      setChangeRequestError(requestError.message)
    } finally {
      setSubmittingChangeRequest(false)
    }
  }

  async function submitLeaveRequest(event) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setSubmittingLeaveRequest(true)
    setLeaveRequestError('')
    setLeaveRequestNotice('')
    try {
      const created = await apiRequest('/dashboard/leave-requests', {
        method: 'POST',
        body: {
          leaveType: formData.get('leaveType'),
          startDate: formData.get('startDate'),
          endDate: formData.get('endDate'),
          reason: formData.get('reason'),
        },
      })
      setLeaveRequests((requests) => [created, ...requests])
      setLeaveRequestNotice('Your leave request was submitted for review.')
      form.reset()
    } catch (requestError) {
      setLeaveRequestError(requestError.message)
    } finally {
      setSubmittingLeaveRequest(false)
    }
  }

  if (loading && !timetable) {
    return <main className="dashboard-page"><div className="dashboard-content" role="status">Loading your timetable...</div></main>
  }

  if (error && !timetable) {
    return <main className="dashboard-page"><div className="dashboard-content dashboard-error" role="alert"><h1>Timetable unavailable</h1><p>{error}</p><button className="sign-out-button" type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button></div></main>
  }

  const today = new Date()
  const todayClasses = timetable.today.classes
  const isFaculty = session.role === 'faculty'
  const weeklyClasses = timetable.week.flatMap((day) => day.classes)
  const roleLabel = isFaculty ? 'Faculty' : 'Student'
  const cohortParts = (session.cohort || '').split('·').map((part) => part.trim())
  const now = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`
  const weekStart = new Date(`${timetable.weekStart}T12:00:00`)
  const weekEnd = new Date(`${timetable.weekEnd}T12:00:00`)
  const weekLabel = `${formatDate(weekStart, { month: 'short', day: 'numeric' })} - ${formatDate(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <a className="dashboard-brand" href="#dashboard" aria-label="Timetable Allocation and Management home">
          <span className="dashboard-brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>Timetable Allocation<br />&amp; Management</span>
        </a>
        <div className="dashboard-account">
          <div className="account-copy">
            <span>{roleLabel} account</span>
            <strong>{session.identity}</strong>
          </div>
          <button className="sign-out-button" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <div className="dashboard-content" id="dashboard">
        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">CAMPUS OVERVIEW <span>·</span> {roleLabel.toUpperCase()}</p>
            <h1>Your timetable.</h1>
            <p className="dashboard-date">{timetable.today.label}</p>
            {session.role === 'student' && (
              <p className="dashboard-cohort">
                <span>Class: {cohortParts[0] || 'Not assigned'}</span>
                <span>Section: {cohortParts[1] || 'Not assigned'}</span>
              </p>
            )}
          </div>
          <span className="demo-badge"><i /> LIVE TIMETABLE</span>
        </section>

        <section className="dashboard-stats" aria-label="Timetable summary">
          <article className="stat-item">
            <span className="stat-label">TODAY</span>
            <strong>{todayClasses.length}</strong>
            <span>{todayClasses.length === 1 ? 'class scheduled' : 'classes scheduled'}</span>
          </article>
          <article className="stat-item">
            <span className="stat-label">THIS WEEK</span>
            <strong>{timetable.summary.weekCount}</strong>
            <span>classes on the timetable</span>
          </article>
          <article className="stat-item next-class-stat">
            <span className="stat-label">UP NEXT</span>
            <strong>{timetable.summary.nextClass?.start || '—'}</strong>
            <span>{timetable.summary.nextClass?.course || 'No more classes today'}</span>
          </article>
        </section>

        {isFaculty && (
          <section className="faculty-workload" aria-labelledby="faculty-workload-heading">
            <div className="faculty-workload-heading"><div><p className="section-kicker">PUBLISHED TIMETABLE</p><h2 id="faculty-workload-heading">Your workload</h2></div>
              {facultyWorkload && <span className={`workload-status workload-${facultyWorkload.workloadStatus.toLowerCase().replaceAll(' ', '-')}`}>{facultyWorkload.workloadStatus}</span>}
            </div>
            {facultyWorkloadError && <p className="notification-error" role="alert">{facultyWorkloadError}</p>}
            {facultyWorkload ? <>
              <div className="faculty-workload-metrics">
                <article><span>WEEKLY HOURS</span><strong>{facultyWorkload.weeklyTeachingHours}</strong></article>
                <article><span>CLASSES</span><strong>{facultyWorkload.numberOfClasses}</strong></article>
              </div>
              <div className="faculty-daily-workload">
                <strong className="daily-hours-label">Daily hours</strong>
                <table className="daily-hours-table" aria-label="Daily teaching hours">
                  <thead>
                    <tr>
                      {facultyWorkload.dailyTeachingHours.map((day) => (
                        <th key={day.day} scope="col">{day.day.slice(0, 3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {facultyWorkload.dailyTeachingHours.map((day) => (
                        <td key={day.day}>{day.hours}<span>h</span></td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </> : !facultyWorkloadError && <p className="workload-loading" role="status">Loading workload...</p>}
          </section>
        )}

        {session.role === 'student' && (
          <section className="notification-section" aria-labelledby="notification-heading">
            <div className="notification-heading">
              <div><p className="section-kicker">TIMETABLE ALERTS</p><h2 id="notification-heading">Change notifications</h2></div>
            </div>
            {notificationError && <p className="notification-error" role="alert">{notificationError}</p>}
            <div className="notification-list" aria-live="polite">
              {notifications.length > 0 ? notifications.map((item) => (
                <article className="notification-item" key={item.id}>
                  <div><strong>{item.title}</strong><p>{item.message}</p></div>
                  <time dateTime={item.createdAt}>{formatDate(new Date(item.createdAt), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                </article>
              )) : <p className="notification-empty">New timetable changes will appear here.</p>}
            </div>
          </section>
        )}

        <nav className="timetable-tabs" aria-label="Timetable views">
          <button type="button" className={activeSection === 'today' ? 'is-active' : ''} aria-current={activeSection === 'today' ? 'page' : undefined} onClick={() => setActiveSection('today')}>Today</button>
          <button type="button" className={activeSection === 'week' ? 'is-active' : ''} aria-current={activeSection === 'week' ? 'page' : undefined} onClick={() => setActiveSection('week')}>Weekly timetable</button>
          {isFaculty && <button type="button" className={activeSection === 'request' ? 'is-active' : ''} aria-current={activeSection === 'request' ? 'page' : undefined} onClick={() => setActiveSection('request')}>Request changes</button>}
          {isFaculty && <button type="button" className={activeSection === 'leave' ? 'is-active' : ''} aria-current={activeSection === 'leave' ? 'page' : undefined} onClick={() => setActiveSection('leave')}>Request leave</button>}
        </nav>

        {activeSection === 'today' && <section className="today-section" aria-labelledby="today-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">DAY AT A GLANCE</p>
              <h2 id="today-heading">Today&apos;s timetable</h2>
            </div>
            <span className="today-date-chip">{formatDate(new Date(`${timetable.today.date}T12:00:00`), { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>

          {todayClasses.length > 0 ? (
            <div className="today-list">
              {todayClasses.map((item) => (
                <article className="today-class" key={item.code}>
                  <div className="class-time"><strong>{item.start}</strong><span>{item.end}</span></div>
                  <span className="class-color-bar" aria-hidden="true" />
                  <div className="class-main">
                    <div className="class-title-row"><h3>{item.course}</h3><span>{item.code}</span></div>
                    <p>{item.room} <span>·</span> {isFaculty ? item.group : item.instructor}</p>
                  </div>
                  <span className="class-status">
                    {item.start > now ? 'UPCOMING' : item.end > now ? 'IN PROGRESS' : 'COMPLETED'}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-day">No classes are scheduled for today.</div>
          )}
        </section>}

        {activeSection === 'week' && <section className="week-section" aria-labelledby="week-heading">
          <div className="section-heading week-section-heading">
            <div>
              <p className="section-kicker">WEEKLY OVERVIEW</p>
              <h2 id="week-heading">This week</h2>
            </div>
            <div className="week-controls">
              <button type="button" aria-label="Previous week" onClick={() => setWeekOffset((offset) => offset - 1)}>&larr;</button>
              <span>{weekLabel}</span>
              <button type="button" aria-label="Next week" onClick={() => setWeekOffset((offset) => offset + 1)}>&rarr;</button>
              {weekOffset !== 0 && <button className="today-button" type="button" onClick={() => setWeekOffset(0)}>Today</button>}
            </div>
          </div>

          <div className="week-scroll">
            <div className="week-grid">
              {timetable.week.map((day) => {
                const isToday = day.date === timetable.today.date
                return (
                  <section className={`week-day${isToday ? ' is-today' : ''}`} key={day.date} aria-label={`${day.day} timetable`}>
                    <button
                      type="button"
                      className="week-day-heading week-day-heading-btn"
                      aria-label={`View details for ${day.day}`}
                      onClick={() => setSelectedDetail({ type: 'day', data: day })}
                    >
                      <span>{day.day.slice(0, 3)}</span>
                      <strong>{new Date(`${day.date}T12:00:00`).getDate()}</strong>
                    </button>
                    <div className="week-day-classes">
                      {day.classes.length > 0 ? day.classes.map((item) => (
                        <button
                          type="button"
                          className="week-class week-class-btn"
                          key={`${item.code}-${item.start}`}
                          aria-label={`View details for ${item.course}`}
                          onClick={() => setSelectedDetail({ type: 'class', data: item, day })}
                        >
                          <time>{item.start}</time>
                          <strong>{item.course}</strong>
                          <span>{item.room}</span>
                          <span>{isFaculty ? item.group || 'No group' : `Instructor: ${item.instructor || 'Not assigned'}`}</span>
                        </button>
                      )) : <p className="week-empty">No classes</p>}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          {selectedDetail && createPortal(
            <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Class details" onClick={(e) => { if (e.target === e.currentTarget) setSelectedDetail(null) }}>
              <div className="detail-panel">
                <button type="button" className="detail-close" aria-label="Close details" onClick={() => setSelectedDetail(null)}>✕</button>

                {selectedDetail.type === 'day' ? (
                  <>
                    <p className="detail-kicker">DAY OVERVIEW</p>
                    <h3 className="detail-title">{selectedDetail.data.day}</h3>
                    <p className="detail-date">{formatDate(new Date(`${selectedDetail.data.date}T12:00:00`), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <div className="detail-stat-row">
                      <span className="detail-stat"><strong>{selectedDetail.data.classes.length}</strong><small>{selectedDetail.data.classes.length === 1 ? 'class' : 'classes'}</small></span>
                    </div>
                    {selectedDetail.data.classes.length > 0 ? (
                      <ul className="detail-class-list">
                        {selectedDetail.data.classes.map((item) => (
                          <li key={`${item.code}-${item.start}`} className="detail-class-item">
                            <span className="detail-class-time">{item.start} – {item.end}</span>
                            <div>
                              <strong>{item.course}</strong>
                              <small>{item.code}</small>
                            </div>
                            <span className="detail-class-meta">{item.room}</span>
                            <span className="detail-class-meta">{isFaculty ? (item.group || 'No group') : (item.instructor || 'No instructor')}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="detail-empty">No classes scheduled for this day.</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="detail-kicker">CLASS DETAILS</p>
                    <h3 className="detail-title">{selectedDetail.data.course}</h3>
                    <p className="detail-code">{selectedDetail.data.code}</p>
                    <ul className="detail-info-list">
                      <li><span>Day</span><strong>{selectedDetail.day?.day || '—'}</strong></li>
                      <li><span>Time</span><strong>{selectedDetail.data.start} – {selectedDetail.data.end}</strong></li>
                      <li><span>Room</span><strong>{selectedDetail.data.room || '—'}</strong></li>
                      {isFaculty
                        ? <li><span>Group</span><strong>{selectedDetail.data.group || '—'}</strong></li>
                        : <li><span>Instructor</span><strong>{selectedDetail.data.instructor || 'Not assigned'}</strong></li>
                      }
                      {selectedDetail.data.type && <li><span>Type</span><strong>{selectedDetail.data.type}</strong></li>}
                      {selectedDetail.data.status && <li><span>Status</span><strong>{selectedDetail.data.status}</strong></li>}
                    </ul>
                  </>
                )}
              </div>
            </div>,
            document.body
          )}
        </section>}

        {activeSection === 'request' && isFaculty && (
          <section className="faculty-change-section" aria-labelledby="faculty-change-heading">
            <div className="section-heading">
              <div><p className="section-kicker">SCHEDULE SUPPORT</p><h2 id="faculty-change-heading">Request a timetable change</h2></div>
            </div>
            {changeRequestError && <p className="notification-error" role="alert">{changeRequestError}</p>}
            {changeRequestNotice && <p className="change-request-notice" role="status">{changeRequestNotice}</p>}
            <form className="faculty-change-form" onSubmit={submitChangeRequest}>
              <label>Assigned class or lab
                <select name="scheduleId" defaultValue={weeklyClasses[0]?.id ?? ''} required disabled={!weeklyClasses.length}>
                  {weeklyClasses.map((item) => <option key={item.id} value={item.id}>{item.course} · {item.code} · {item.day} {item.start}</option>)}
                </select>
              </label>
              <label>Requested change
                <textarea name="proposedChange" rows="2" maxLength="1000" placeholder="Describe the timetable change you need" required />
              </label>
              <label>Reason
                <textarea name="reason" rows="2" maxLength="1000" placeholder="Explain why this change is needed" required />
              </label>
              <button className="sign-out-button" type="submit" disabled={submittingChangeRequest || !weeklyClasses.length}>
                {submittingChangeRequest ? 'Submitting...' : 'Submit request'}
              </button>
            </form>
            <div className="faculty-request-list" aria-live="polite">
              <h3>Your requests</h3>
              {changeRequests.length ? changeRequests.map((item) => (
                <article className="faculty-request-item" key={item.id}>
                  <div><strong>{item.subject} · {item.code}</strong><p>{item.proposedChange}</p><small>{item.day} {item.start}-{item.end} · {item.reason}</small></div>
                  <span className={`request-status is-${item.status.toLowerCase()}`}>{item.status}</span>
                </article>
              )) : <p className="notification-empty">No timetable change requests yet.</p>}
            </div>
          </section>
        )}

        {activeSection === 'leave' && isFaculty && (
          <section className="faculty-change-section" aria-labelledby="faculty-leave-heading">
            <div className="section-heading">
              <div><p className="section-kicker">LEAVE SUPPORT</p><h2 id="faculty-leave-heading">Request leave</h2></div>
            </div>
            {leaveRequestError && <p className="notification-error" role="alert">{leaveRequestError}</p>}
            {leaveRequestNotice && <p className="change-request-notice" role="status">{leaveRequestNotice}</p>}
            <form className="faculty-leave-form" onSubmit={submitLeaveRequest}>
              <label>Leave type
                <select name="leaveType" defaultValue="Casual Leave" required>
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Earned Leave</option>
                  <option>Other</option>
                </select>
              </label>
              <label>From date
                <input type="date" name="startDate" required />
              </label>
              <label>To date
                <input type="date" name="endDate" required />
              </label>
              <label>Reason
                <textarea name="reason" rows="2" maxLength="1000" placeholder="Explain why you need this leave" required />
              </label>
              <button className="sign-out-button" type="submit" disabled={submittingLeaveRequest}>
                {submittingLeaveRequest ? 'Submitting...' : 'Submit leave request'}
              </button>
            </form>
            <div className="faculty-request-list" aria-live="polite">
              <h3>Your leave requests</h3>
              {leaveRequests.length ? leaveRequests.map((item) => (
                <article className="faculty-request-item" key={item.id}>
                  <div>
                    <strong>{item.leaveType}</strong>
                    <p>{item.startDate} to {item.endDate} · {item.numberOfDays === 1 ? '1 day' : `${item.numberOfDays} days`}</p>
                    <small>{item.reason}</small>
                  </div>
                  <span className={`request-status is-${item.status.toLowerCase()}`}>{item.status}</span>
                </article>
              )) : <p className="notification-empty">No leave requests yet.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default DashboardPage