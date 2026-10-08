import { useEffect, useState } from 'react'
import { apiRequest } from '../api.js'
import './RequestFormFieldsPage.css'

const FORM_LABELS = {
  change: ['Request change', 'Timetable change form'],
  leave: ['Request leave', 'Leave application form'],
}

const TYPE_LABELS = {
  class: 'Class picker (system)',
  text: 'Short text',
  textarea: 'Long text',
  number: 'Number',
  date: 'Date',
  time: 'Time',
  email: 'Email',
  select: 'Dropdown choices',
  checkbox: 'Checkbox',
}

const ADDABLE_TYPES = ['text', 'textarea', 'number', 'date', 'time', 'email', 'select', 'checkbox']
const TEXT_FIELD_TYPES = ['text', 'textarea', 'email', 'number']
const MAX_FIELDS = 15

const blankField = {
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  options: [],
}

function parseOptions(value) {
  // Handles both the raw text typed into the choices input and an array of choices.
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  return source.map((option) => String(option).trim()).filter(Boolean)
}

function RequestFormFieldsPage() {
  const [config, setConfig] = useState({ change: [], leave: [] })
  const [drafts, setDrafts] = useState({ change: [], leave: [] })
  const [activeForm, setActiveForm] = useState('change')
  const [newField, setNewField] = useState({ ...blankField })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    apiRequest('/system/request-form-fields')
      .then((result) => {
        if (!active) return
        setConfig(result)
        setDrafts(result)
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const fields = drafts[activeForm] || []
  const published = config[activeForm] || []
  const isDirty = JSON.stringify(fields) !== JSON.stringify(published)

  function updateDraft(nextFields) {
    setDrafts((current) => ({ ...current, [activeForm]: nextFields }))
  }

  function updateField(index, patch) {
    updateDraft(fields.map((field, position) => (position === index ? { ...field, ...patch } : field)))
  }

  function moveField(index, offset) {
    const target = index + offset
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateDraft(next)
  }

  function removeField(index) {
    updateDraft(fields.filter((_, position) => position !== index))
  }

  function addField() {
    const label = newField.label.trim()
    if (!label) { setError('Give the new input field a label first.'); return }
    const options = newField.type === 'select' ? parseOptions(newField.options) : []
    if (newField.type === 'select' && !options.length) { setError('List the choices for a dropdown field.'); return }
    if (fields.length >= MAX_FIELDS) { setError(`A form can hold at most ${MAX_FIELDS} input fields.`); return }
    setError('')
    setNotice('')
    updateDraft([...fields, { ...blankField, ...newField, label, options }])
    setNewField({ ...blankField })
  }

  function validate(draft) {
    if (!draft.length) return 'Keep at least one input field on the form.'
    for (const field of draft) {
      if (!field.label.trim()) return 'Every input field needs a label.'
      if (field.label.trim().length > 60) return 'Field labels must be 60 characters or fewer.'
      if (field.type === 'select' && !(field.options || []).length) return `List the choices for "${field.label.trim()}".`
    }
    return ''
  }

  async function save() {
    const problem = validate(fields)
    if (problem) { setError(problem); return }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        form: activeForm,
        fields: fields.map((field) => ({
          ...(field.id ? { id: field.id } : {}),
          label: field.label.trim(),
          type: field.type,
          required: Boolean(field.required),
          placeholder: field.placeholder || '',
          options: field.options || [],
        })),
      }
      const result = await apiRequest('/system/request-form-fields', { method: 'PUT', body: payload })
      setConfig(result)
      setDrafts(result)
      setNotice(`${FORM_LABELS[activeForm][0]} fields saved. Faculty see the new form straight away.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function restoreDefaults() {
    if (!window.confirm('Restore the original fields for this form? Custom fields you added will be removed.')) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest('/system/request-form-fields', { method: 'PUT', body: { form: activeForm, restoreDefaults: true } })
      setConfig(result)
      setDrafts(result)
      setNotice(`${FORM_LABELS[activeForm][0]} restored to its default fields.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <section className="super-panel request-forms-panel"><p className="request-forms-loading" role="status">Loading request form fields...</p></section>
  }

  return (
    <section className="super-panel request-forms-panel">
      <div className="super-panel-heading">
        <div>
          <p className="super-kicker">FACULTY DASHBOARD</p>
          <h2>Request form fields</h2>
          <p>Add or remove the input faculty fill in when they submit a timetable change or leave request.</p>
        </div>
        <button className="super-secondary-button" type="button" onClick={restoreDefaults} disabled={saving}>Restore defaults</button>
      </div>

      <div className="request-forms-toolbar">
        <div className="request-form-switch" role="tablist" aria-label="Faculty request forms">
          {Object.entries(FORM_LABELS).map(([id, [label, description]]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeForm === id}
              className={activeForm === id ? 'is-active' : ''}
              onClick={() => { setActiveForm(id); setError(''); setNotice('') }}
            >
              <strong>{label}</strong>
              <span>{description} · {(drafts[id] || []).length} fields</span>
            </button>
          ))}
        </div>
        <span className="request-forms-status">
          {isDirty ? 'Unsaved changes' : `${published.length} fields published`}
        </span>
      </div>

      {notice && <p className="super-notice request-forms-notice" role="status">{notice}</p>}
      {error && <p className="super-notice is-error" role="alert">{error}</p>}

      <ol className="request-field-list">
        {fields.map((field, index) => (
          <li key={field.id || `draft-${index}`}>
            <span className="request-field-order" aria-hidden="true">{index + 1}</span>
            <div className="request-field-body">
              <label className="request-field-label">Field label
                <input
                  value={field.label}
                  maxLength={60}
                  placeholder="e.g. Preferred day"
                  onChange={(event) => updateField(index, { label: event.target.value })}
                />
              </label>
              <label className="request-field-label">Input type
                <select
                  value={field.type}
                  disabled={Boolean(field.builtIn)}
                  title={field.builtIn ? 'System fields keep their input type' : undefined}
                  onChange={(event) => updateField(index, { type: event.target.value, options: [] })}
                >
                  {field.type && <option value={field.type}>{TYPE_LABELS[field.type] || field.type}</option>}
                  {!field.builtIn && ADDABLE_TYPES.filter((type) => type !== field.type).map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
                </select>
              </label>
              <label className="request-field-required">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  disabled={Boolean(field.locked)}
                  onChange={(event) => updateField(index, { required: event.target.checked })}
                />
                Required
              </label>
              {field.type === 'select' && (
                <label className="request-field-label request-field-span">Choices (comma separated)
                  <input
                    value={(field.options || []).join(', ')}
                    placeholder="Monday, Tuesday, Friday"
                    disabled={Boolean(field.builtIn && field.key === 'leaveType')}
                    onChange={(event) => updateField(index, { options: parseOptions(event.target.value) })}
                  />
                </label>
              )}
              {TEXT_FIELD_TYPES.includes(field.type) && (
                <label className="request-field-label request-field-span">Placeholder text
                  <input
                    value={field.placeholder || ''}
                    maxLength={120}
                    placeholder="Shown inside the empty input"
                    onChange={(event) => updateField(index, { placeholder: event.target.value })}
                  />
                </label>
              )}
              {field.locked && <p className="request-field-lock">The class picker is required — a change request cannot be submitted without it.</p>}
            </div>
            <div className="request-field-actions">
              <button type="button" aria-label={`Move ${field.label || 'field'} up`} disabled={index === 0} onClick={() => moveField(index, -1)}>↑</button>
              <button type="button" aria-label={`Move ${field.label || 'field'} down`} disabled={index === fields.length - 1} onClick={() => moveField(index, 1)}>↓</button>
              <button type="button" className="is-remove" aria-label={`Remove ${field.label || 'field'}`} disabled={Boolean(field.locked)} onClick={() => removeField(index)}>✕</button>
            </div>
          </li>
        ))}
      </ol>

      <div className="request-new-field">
        <p className="super-kicker">ADD AN INPUT FIELD</p>
        <div className="request-new-field-row">
          <label className="request-field-label">Field label
            <input value={newField.label} maxLength={60} placeholder="e.g. Preferred day" onChange={(event) => setNewField({ ...newField, label: event.target.value })} />
          </label>
          <label className="request-field-label">Input type
            <select value={newField.type} onChange={(event) => setNewField({ ...newField, type: event.target.value, options: [] })}>
              {ADDABLE_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
            </select>
          </label>
          <label className="request-field-label">Placeholder text
            <input
              value={newField.placeholder}
              maxLength={120}
              disabled={!TEXT_FIELD_TYPES.includes(newField.type)}
              placeholder="Shown inside the empty input"
              onChange={(event) => setNewField({ ...newField, placeholder: event.target.value })}
            />
          </label>
          {newField.type === 'select' && (
            <label className="request-field-label">Choices (comma separated)
              <input value={newField.options.join(', ')} placeholder="Monday, Tuesday, Friday" onChange={(event) => setNewField({ ...newField, options: parseOptions(event.target.value) })} />
            </label>
          )}
          <label className="request-field-required">
            <input type="checkbox" checked={newField.required} onChange={(event) => setNewField({ ...newField, required: event.target.checked })} />
            Required
          </label>
          <button className="super-secondary-button" type="button" onClick={addField}>+ Add field</button>
        </div>
      </div>

      <div className="request-forms-actions">
        <button className="super-secondary-button" type="button" disabled={!isDirty || saving} onClick={() => { setDrafts(config); setError(''); setNotice('') }}>Discard changes</button>
        <button className="super-primary-button" type="button" disabled={!isDirty || saving} onClick={save}>{saving ? 'Saving...' : 'Save fields'}</button>
      </div>
    </section>
  )
}

export default RequestFormFieldsPage
