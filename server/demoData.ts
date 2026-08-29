import { Medicine, MedicationEvent, Alert, Caregiver, PatientProfile, AppSettings } from '../src/types.js';
import { DatabaseSchema } from './db.js';

export function generateHackathonDemoData(): DatabaseSchema {
  const patient: PatientProfile = {
    id: 'patient-001',
    name: 'Eleanor Vance',
    age: 68,
    gender: 'Female',
    bloodGroup: 'A+',
    conditionSummary: 'Hypertension, Mild Osteoarthritis & Type 2 Diabetes Management',
    doctorName: 'Dr. Sarah Jenkins, MD (Cardiology & Internal Medicine)',
    emergencyContact: '+1 (555) 234-8901',
    timezone: 'America/New_York',
  };

  const medicines: Medicine[] = [
    {
      id: 'med-01',
      patientId: 'patient-001',
      name: 'Metformin HCl',
      dosage: '500 mg',
      form: 'Tablet',
      quantity: 90,
      remainingQuantity: 52,
      reminderTimes: ['08:00', '13:00', '20:00'],
      frequency: 'Three times daily',
      durationDays: 30,
      startDate: getFormattedDateOffset(-14),
      endDate: getFormattedDateOffset(16),
      instructions: 'Take with main meals to reduce GI irritation and support glucose control.',
      foodTiming: 'With Food',
      active: true,
      qrCodeData: 'MED-METF-500-MG-BATCH-A401',
      barcode: '890103000202',
      color: '#10B981',
      notes: 'Prescribed for Glycemic Control (HbA1c target < 7.0%)',
      createdAt: getFormattedDateOffset(-14) + 'T08:00:00Z',
    },
    {
      id: 'med-02',
      patientId: 'patient-001',
      name: 'Lisinopril',
      dosage: '10 mg',
      form: 'Tablet',
      quantity: 30,
      remainingQuantity: 16,
      reminderTimes: ['08:00'],
      frequency: 'Once daily',
      durationDays: 30,
      startDate: getFormattedDateOffset(-14),
      endDate: getFormattedDateOffset(16),
      instructions: 'Take every morning with a full glass of water. Monitor blood pressure weekly.',
      foodTiming: 'Before Food',
      active: true,
      qrCodeData: 'MED-LISI-010-MG-BATCH-B109',
      barcode: '890103000404',
      color: '#0D6EFD',
      notes: 'Blood Pressure Regulation. Target BP < 130/80 mmHg',
      createdAt: getFormattedDateOffset(-14) + 'T08:00:00Z',
    },
    {
      id: 'med-03',
      patientId: 'patient-001',
      name: 'Paracetamol Extra',
      dosage: '500 mg',
      form: 'Tablet',
      quantity: 60,
      remainingQuantity: 34,
      reminderTimes: ['08:00', '20:00'],
      frequency: 'Twice daily',
      durationDays: 30,
      startDate: getFormattedDateOffset(-14),
      endDate: getFormattedDateOffset(16),
      instructions: 'Take after meals for knee joint pain relief. Do not exceed 4g in 24 hours.',
      foodTiming: 'After Food',
      active: true,
      qrCodeData: 'MED-PARA-500-MG-BATCH-C772',
      barcode: '890103000101',
      color: '#6366F1',
      notes: 'Symptomatic osteoarthritis pain relief',
      createdAt: getFormattedDateOffset(-14) + 'T08:00:00Z',
    },
    {
      id: 'med-04',
      patientId: 'patient-001',
      name: 'Vitamin D3 Cholecalciferol',
      dosage: '1000 IU',
      form: 'Capsule',
      quantity: 30,
      remainingQuantity: 16,
      reminderTimes: ['13:00'],
      frequency: 'Once daily',
      durationDays: 30,
      startDate: getFormattedDateOffset(-14),
      endDate: getFormattedDateOffset(16),
      instructions: 'Take with afternoon meal containing healthy fats for optimal absorption.',
      foodTiming: 'With Food',
      active: true,
      qrCodeData: 'MED-VITD-1000-IU-BATCH-D304',
      barcode: '890103000505',
      color: '#F59E0B',
      notes: 'Bone mineral density and immune maintenance',
      createdAt: getFormattedDateOffset(-14) + 'T08:00:00Z',
    },
    {
      id: 'med-05',
      patientId: 'patient-001',
      name: 'Atorvastatin',
      dosage: '20 mg',
      form: 'Tablet',
      quantity: 30,
      remainingQuantity: 16,
      reminderTimes: ['21:00'],
      frequency: 'Once daily',
      durationDays: 30,
      startDate: getFormattedDateOffset(-14),
      endDate: getFormattedDateOffset(16),
      instructions: 'Take at night before bed. Avoid grapefruit and grapefruit juice.',
      foodTiming: 'After Food',
      active: true,
      qrCodeData: 'MED-ATOR-020-MG-BATCH-E911',
      barcode: '890103000303',
      color: '#8B5CF6',
      notes: 'Hyperlipidemia and cardiovascular prevention',
      createdAt: getFormattedDateOffset(-14) + 'T08:00:00Z',
    },
  ];

  const events: MedicationEvent[] = [];
  const alerts: Alert[] = [];

  // Generate 14 past days of events
  for (let offset = -13; offset <= 0; offset++) {
    const dateStr = getFormattedDateOffset(offset);
    const isToday = offset === 0;

    for (const med of medicines) {
      for (const time of med.reminderTimes) {
        const eventId = `evt-${med.id}-${dateStr}-${time.replace(':', '')}`;

        if (isToday) {
          // Today's schedule status based on standard morning/afternoon/evening slots
          const [h] = time.split(':').map(Number);
          if (h <= 10) {
            // Morning doses are taken on time and verified
            events.push({
              id: eventId,
              medicineId: med.id,
              medicineName: med.name,
              dosage: med.dosage,
              scheduledDate: dateStr,
              scheduledTime: time,
              actualDate: dateStr,
              actualTime: `${String(h).padStart(2, '0')}:${Math.floor(Math.random() * 5 + 3)}`,
              status: 'Taken on Time',
              verificationStatus: 'Verified',
              verifiedWith: 'QR',
              verificationCodeScanned: med.qrCodeData,
              notes: 'QR Verification successful at bedside container',
            });
          } else if (h <= 14) {
            // Afternoon dose is Due Now / Pending
            events.push({
              id: eventId,
              medicineId: med.id,
              medicineName: med.name,
              dosage: med.dosage,
              scheduledDate: dateStr,
              scheduledTime: time,
              status: 'Due Now',
              verificationStatus: 'Not Verified',
              notes: 'Awaiting patient confirmation after lunch',
            });
          } else {
            // Evening doses are Upcoming
            events.push({
              id: eventId,
              medicineId: med.id,
              medicineName: med.name,
              dosage: med.dosage,
              scheduledDate: dateStr,
              scheduledTime: time,
              status: 'Upcoming',
              verificationStatus: 'Not Verified',
              notes: 'Scheduled for tonight',
            });
          }
        } else {
          // Past days
          // Create realistic patterns:
          // Morning (08:00): Very reliable (96% on-time, 4% late)
          // Afternoon (13:00): High reliability (92% on-time, 8% late)
          // Evening (20:00, 21:00): Friction area! (75% on-time, 18% late, 7% missed)
          const [h] = time.split(':').map(Number);
          let status: MedicationEvent['status'] = 'Taken on Time';
          let vStatus: MedicationEvent['verificationStatus'] = 'Verified';
          let actualTime = time;

          // Introduce specific realistic missed events to highlight AI detection:
          // Day -3 evening was completely missed (both Metformin & Atorvastatin)
          // Day -7 evening was taken late (45 mins late)
          // Day -10 afternoon was missed
          if (offset === -3 && h >= 20) {
            status = 'Missed';
            vStatus = 'Not Verified';
            actualTime = undefined as any;
          } else if (offset === -7 && h >= 20) {
            status = 'Taken Late';
            vStatus = 'Verified';
            actualTime = `${h}:${Math.floor(Math.random() * 20 + 35)}`;
          } else if (offset === -10 && h === 13) {
            status = 'Missed';
            vStatus = 'Not Verified';
            actualTime = undefined as any;
          } else {
            // General probabilities
            const rand = Math.random();
            if (h >= 20) {
              if (rand < 0.15) {
                status = 'Taken Late';
                actualTime = `${h}:${Math.floor(Math.random() * 25 + 31)}`;
              } else if (rand < 0.18) {
                status = 'Missed';
                vStatus = 'Not Verified';
                actualTime = undefined as any;
              } else {
                status = 'Taken on Time';
                actualTime = `${String(h).padStart(2, '0')}:${String(Math.floor(Math.random() * 8)).padStart(2, '0')}`;
              }
            } else {
              if (rand < 0.06) {
                status = 'Taken Late';
                actualTime = `${h}:${Math.floor(Math.random() * 20 + 32)}`;
              } else {
                status = 'Taken on Time';
                actualTime = `${String(h).padStart(2, '0')}:${String(Math.floor(Math.random() * 6)).padStart(2, '0')}`;
              }
            }
          }

          events.push({
            id: eventId,
            medicineId: med.id,
            medicineName: med.name,
            dosage: med.dosage,
            scheduledDate: dateStr,
            scheduledTime: time,
            actualDate: actualTime ? dateStr : undefined,
            actualTime: actualTime,
            status: status,
            verificationStatus: vStatus,
            verifiedWith: status === 'Missed' ? undefined : 'QR',
            verificationCodeScanned: status === 'Missed' ? undefined : med.qrCodeData,
            notes: status === 'Missed' ? 'Patient did not record intake within window' : 'Taken with prescribed meal',
          });
        }
      }
    }
  }

  // Pre-seed realistic alerts
  alerts.push(
    {
      id: 'alt-01',
      patientId: 'patient-001',
      medicineId: 'med-01',
      medicineName: 'Metformin HCl',
      alertType: 'MISSED_DOSE',
      message: `Missed evening dose of Metformin HCl 500mg scheduled at 20:00 on ${getFormattedDateOffset(-3)}. Escalated to Caregiver.`,
      priority: 'HIGH',
      createdAt: getFormattedDateOffset(-3) + 'T21:45:00Z',
      acknowledged: true,
      acknowledgedAt: getFormattedDateOffset(-3) + 'T22:05:00Z',
      acknowledgedBy: 'Michael Vance (Son)',
      actionTaken: 'Called patient to confirm mild stomach upset; dose rescheduled with next breakfast.',
    },
    {
      id: 'alt-02',
      patientId: 'patient-001',
      medicineId: 'med-05',
      medicineName: 'Atorvastatin',
      alertType: 'MISSED_DOSE',
      message: `Missed night dose of Atorvastatin 20mg on ${getFormattedDateOffset(-3)}.`,
      priority: 'HIGH',
      createdAt: getFormattedDateOffset(-3) + 'T22:30:00Z',
      acknowledged: true,
      acknowledgedAt: getFormattedDateOffset(-2) + 'T07:15:00Z',
      acknowledgedBy: 'Nurse Clara Rodriguez, RN',
      actionTaken: 'Patient reminded during morning check-in.',
    },
    {
      id: 'alt-03',
      patientId: 'patient-001',
      alertType: 'HIGH_RISK_DETECTED',
      message: 'AI Adherence Pattern Alert: Evening medication doses have a 24% late/missed probability over the last 14 days.',
      priority: 'MEDIUM',
      createdAt: getFormattedDateOffset(-1) + 'T18:00:00Z',
      acknowledged: false,
    },
    {
      id: 'alt-04',
      patientId: 'patient-001',
      medicineId: 'med-02',
      medicineName: 'Lisinopril',
      alertType: 'REFILL_NEEDED',
      message: 'Lisinopril 10mg has 16 tablets remaining (approx. 16 days of treatment). Refill recommendation initiated.',
      priority: 'LOW',
      createdAt: getFormattedDateOffset(0) + 'T07:30:00Z',
      acknowledged: false,
    }
  );

  const caregivers: Caregiver[] = [
    {
      id: 'cg-001',
      name: 'Michael Vance (Son)',
      relationship: 'Primary Family Caregiver',
      phone: '+1 (555) 987-6543',
      email: 'michael.vance@example.com',
      notificationLevel: 'ALL',
      active: true,
    },
    {
      id: 'cg-002',
      name: 'Nurse Clara Rodriguez, RN',
      relationship: 'Visiting Home Care Nurse',
      phone: '+1 (555) 456-7890',
      email: 'clara.rodriguez@healthcare.org',
      notificationLevel: 'CRITICAL_ONLY',
      active: true,
    },
    {
      id: 'cg-003',
      name: 'Dr. Sarah Jenkins, MD',
      relationship: 'Attending Cardiologist',
      phone: '+1 (555) 321-4567',
      email: 'dr.jenkins@mercyheartclinic.org',
      notificationLevel: 'ESCALATED',
      active: true,
    },
  ];

  const settings: AppSettings = {
    earlyReminderMinutes: 15,
    lateThresholdMinutes: 5,
    missedThresholdMinutes: 30,
    requireVerification: true,
    audioAlerts: true,
    voiceReminders: true,
    simulatedTimeOffsetMinutes: 0,
    currentSimulatedDate: getFormattedDateOffset(0),
    caregivers: caregivers,
  };

  return {
    patient,
    medicines,
    events,
    alerts,
    caregivers,
    settings,
  };
}

function getFormattedDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}
