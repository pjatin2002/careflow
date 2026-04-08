import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const TEAL = [29, 158, 117]
const DARK = [26, 26, 24]
const GRAY = [95, 94, 90]
const LIGHT = [248, 247, 244]

function addHeader(doc, title, subtitle, facility) {
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, 220, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('CareFlow', 14, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(facility || 'Care Facility', 14, 16)
  doc.setTextColor(...DARK)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 30)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(subtitle, 14, 36)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 41)
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.5)
  doc.line(14, 44, 196, 44)
  return 50
}

function addFooter(doc, pageNum, totalPages) {
  const pageHeight = doc.internal.pageSize.height
  doc.setDrawColor(220, 218, 212)
  doc.setLineWidth(0.3)
  doc.line(14, pageHeight - 12, 196, pageHeight - 12)
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('CareFlow — HIPAA-compliant care management', 14, pageHeight - 7)
  doc.text(`Page ${pageNum} of ${totalPages}`, 196, pageHeight - 7, { align: 'right' })
  doc.text('CONFIDENTIAL — For authorized personnel only', 105, pageHeight - 7, { align: 'center' })
}

export function generateMedicationLogPDF({ resident, medications, records, facilityName, dateRange }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const resName = `${resident.first_name} ${resident.last_name}`
  const subtitle = `Room ${resident.room} | DOB: ${resident.date_of_birth || 'N/A'} | ${dateRange}`
  let y = addHeader(doc, '30-Day Medication Administration Record', subtitle, facilityName)

  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.text('Resident:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(resName, 35, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Physician:', 100, y)
  doc.setFont('helvetica', 'normal')
  doc.text(resident.physician || 'N/A', 121, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Allergies:', 180, y)
  doc.setFont('helvetica', 'normal')
  doc.text(resident.allergies || 'NKDA', 198, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.text('Code Status:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(resident.code_status || 'Full Code', 35, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Diagnosis:', 100, y)
  doc.setFont('helvetica', 'normal')
  doc.text(resident.primary_diagnosis || 'N/A', 121, y)
  y += 8

  medications.forEach((med, idx) => {
    if (y > 170) {
      addFooter(doc, doc.internal.getCurrentPageInfo().pageNumber, '?')
      doc.addPage()
      y = addHeader(doc, '30-Day Medication Administration Record (cont.)', subtitle, facilityName)
    }

    doc.setFillColor(...LIGHT)
    doc.rect(14, y - 4, 268, 8, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEAL)
    doc.text(`${idx + 1}. ${med.drug_name}${med.generic_name ? ` (${med.generic_name})` : ''}`, 16, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.text(`${med.dose} | ${med.route} | ${med.frequency}${med.prn ? ' | PRN' : ''}${med.prescribing_physician ? ` | Dr. ${med.prescribing_physician}` : ''}`, 16, y + 4)
    y += 12

    const medRecords = records.filter(r => r.medication_id === med.id)
    const tableData = medRecords.map(r => [
      r.scheduled_time ? new Date(r.scheduled_time).toLocaleDateString() : '',
      r.scheduled_time ? new Date(r.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      r.status?.toUpperCase() || 'PENDING',
      r.administered_at ? new Date(r.administered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      r.profiles?.full_name || '—',
      r.notes || '—',
    ])

    if (tableData.length === 0) {
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text('No administration records for this period.', 20, y)
      y += 6
    } else {
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Scheduled', 'Status', 'Given at', 'Staff', 'Notes']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: TEAL, textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: DARK },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: {
          0: { cellWidth: 25 }, 1: { cellWidth: 22 }, 2: { cellWidth: 20 },
          3: { cellWidth: 22 }, 4: { cellWidth: 35 }, 5: { cellWidth: 'auto' },
        },
        didDrawCell: (data) => {
          if (data.column.index === 2 && data.cell.section === 'body') {
            const status = data.cell.raw
            if (status === 'GIVEN') doc.setTextColor(8, 80, 65)
            else if (status === 'MISSED' || status === 'REFUSED') doc.setTextColor(121, 31, 31)
            else if (status === 'HELD') doc.setTextColor(12, 68, 124)
          }
        },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 8
    }
  })

  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, i, totalPages)
  }

  doc.save(`CareFlow_MAR_${resName.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateIncidentReportPDF({ incidents, facilityName, dateRange }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = addHeader(doc, 'Incident Report', dateRange, facilityName)

  const summary = { fall: 0, medical: 0, behavioral: 0, medication_error: 0, other: 0 }
  incidents.forEach(i => { summary[i.incident_type] = (summary[i.incident_type] || 0) + 1 })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Summary', 14, y)
  y += 5

  const summaryData = Object.entries(summary).filter(([, v]) => v > 0).map(([k, v]) => [k.replace('_', ' ').toUpperCase(), v.toString()])
  autoTable(doc, {
    startY: y,
    head: [['Incident Type', 'Count']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 } },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Incident Details', 14, y)
  y += 5

  const tableData = incidents.map(inc => [
    new Date(inc.occurred_at).toLocaleDateString(),
    `${inc.residents?.first_name || ''} ${inc.residents?.last_name || ''}`,
    inc.residents?.room || '',
    inc.incident_type.replace('_', ' '),
    inc.severity.toUpperCase(),
    inc.status,
    inc.description?.substring(0, 60) + (inc.description?.length > 60 ? '...' : ''),
    inc.physician_notified ? 'Yes' : 'No',
    inc.family_notified ? 'Yes' : 'No',
  ])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Resident', 'Room', 'Type', 'Severity', 'Status', 'Description', 'MD', 'Family']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: 255, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 18 }, 1: { cellWidth: 28 }, 2: { cellWidth: 12 },
      3: { cellWidth: 22 }, 4: { cellWidth: 16 }, 5: { cellWidth: 18 },
      6: { cellWidth: 'auto' }, 7: { cellWidth: 10 }, 8: { cellWidth: 12 },
    },
    margin: { left: 14, right: 14 },
  })

  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, i, totalPages)
  }

  doc.save(`CareFlow_Incidents_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateCensusReportPDF({ residents, facilityName }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  let y = addHeader(doc, 'Census Report', `As of ${new Date().toLocaleDateString()}`, facilityName)

  const active = residents.filter(r => r.status === 'active').length
  const hospital = residents.filter(r => r.status === 'hospital').length

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Total census: ${residents.length} | Active: ${active} | Hospital: ${hospital}`, 14, y)
  y += 8

  const tableData = residents.map(r => [
    r.room || '',
    `${r.last_name}, ${r.first_name}`,
    r.date_of_birth || '',
    r.admission_date || '',
    r.status?.toUpperCase() || '',
    r.primary_diagnosis || '',
    r.physician || '',
    r.code_status || '',
    r.insurance_type || '',
    r.allergies || 'NKDA',
    r.emergency_contact_name || '',
    r.emergency_contact_phone || '',
  ])

  autoTable(doc, {
    startY: y,
    head: [['Room', 'Name', 'DOB', 'Admitted', 'Status', 'Diagnosis', 'Physician', 'Code', 'Insurance', 'Allergies', 'Emergency Contact', 'Phone']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: 255, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
  })

  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, i, totalPages)
  }

  doc.save(`CareFlow_Census_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateStaffCertPDF({ staff, facilityName }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = addHeader(doc, 'Staff Certification Report', `Generated ${new Date().toLocaleDateString()}`, facilityName)

  const today = new Date()
  const soon = new Date()
  soon.setDate(soon.getDate() + 60)

  const expiring = staff.filter(s => s.cert_expiry && new Date(s.cert_expiry) < soon)
  if (expiring.length > 0) {
    doc.setFillColor(250, 238, 218)
    doc.rect(14, y - 3, 182, 8, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(99, 56, 6)
    doc.text(`⚠ ${expiring.length} certification(s) expiring within 60 days: ${expiring.map(s => s.full_name).join(', ')}`, 16, y + 2)
    y += 10
  }

  const tableData = staff.map(s => {
    const exp = s.cert_expiry ? new Date(s.cert_expiry) : null
    const status = !exp ? 'N/A' : exp < today ? 'EXPIRED' : exp < soon ? 'EXPIRING SOON' : 'Current'
    return [
      s.full_name || '',
      s.role?.replace('_', ' ') || '',
      s.shift || '',
      s.phone || '',
      s.certification || '',
      s.cert_expiry || '',
      status,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Role', 'Shift', 'Phone', 'Certification', 'Expiry Date', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT },
    didDrawCell: (data) => {
      if (data.column.index === 6 && data.cell.section === 'body') {
        const val = data.cell.raw
        if (val === 'EXPIRED') doc.setTextColor(121, 31, 31)
        else if (val === 'EXPIRING SOON') doc.setTextColor(99, 56, 6)
        else if (val === 'Current') doc.setTextColor(8, 80, 65)
      }
    },
    margin: { left: 14, right: 14 },
  })

  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, i, totalPages)
  }

  doc.save(`CareFlow_Staff_Certs_${new Date().toISOString().split('T')[0]}.pdf`)
}
