export type FrequencyType =
  | 'Once daily'
  | 'Twice daily'
  | 'Three times daily'
  | 'Every 8 hours'
  | 'Every 12 hours'
  | 'Weekly'
  | 'As needed';

export type FoodTiming = 'Before Food' | 'After Food' | 'With Food' | 'Empty Stomach' | 'No Restriction';

export type DosageForm = 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Inhaler' | 'Drops' | 'Cream';

export type MedicationStatus =
  | 'Pending'
  | 'Upcoming'
  | 'Due Now'
  | 'Taken on Time'
  | 'Taken Late'
  | 'Missed'
  | 'Verification Required'
  | 'Wrong Medicine';

export type VerificationStatus =
  | 'Not Verified'
  | 'Verified'
  | 'Wrong Medicine'
  | 'Verification Failed';

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface Medicine {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  form: DosageForm;
  quantity: number;
  remainingQuantity: number;
  reminderTimes: string[]; // e.g. ["08:00", "20:00"]
  frequency: FrequencyType;
  durationDays: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  instructions: string;
  foodTiming: FoodTiming;
  active: boolean;
  qrCodeData: string;
  barcode: string;
  color: string;
  notes?: string;
  createdAt: string;
  ownerUid?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role?: 'Patient' | 'Caregiver';
  createdAt: string;
  passwordHash?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  patient?: PatientProfile;
  role?: 'Patient' | 'Caregiver' | null;
}

export type CaregiverLinkStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';

export interface CaregiverPermissions {
  view_schedule: boolean;
  view_adherence: boolean;
  receive_delayed_alerts: boolean;
  receive_missed_alerts: boolean;
  view_history: boolean;
  view_ai_risk: boolean;
}

export interface CaregiverInvitation {
  id: string;
  patientId: string;
  patientOwnerUid: string;
  patientName?: string;
  caregiverUid?: string;
  caregiverEmail: string;
  caregiverName?: string;
  relationship: string;
  permissions: CaregiverPermissions;
  status: CaregiverLinkStatus;
  invitedAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  tokenHash?: string;
}

export interface CaregiverLink {
  id: string;
  patientId: string;
  patientOwnerUid: string;
  patientName?: string;
  caregiverUid: string;
  caregiverEmail: string;
  caregiverName: string;
  relationship: string;
  permissions: CaregiverPermissions;
  status: CaregiverLinkStatus;
  invitedAt: string;
  acceptedAt?: string;
  revokedAt?: string;
}

export interface CaregiverNotification {
  id: string;
  recipientUid: string;
  patientId: string;
  title: string;
  message: string;
  alertType: string;
  isRead: boolean;
  createdAt: string;
  eventId?: string;
}

export interface CaretakerAccessCode {
  id: string;
  patientId: string;
  patientOwnerUid: string;
  codeHash: string;
  code?: string;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  linkId: string;
  senderUid: string;
  senderName: string;
  senderRole: 'Patient' | 'Caregiver';
  receiverUid: string;
  receiverName: string;
  receiverRole: 'Patient' | 'Caregiver';
  text: string;
  createdAt: string;
}

export interface CaregiverProfile {
  id: string;
  firebaseUid: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationEvent {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  actualTime?: string; // HH:mm or ISO
  actualDate?: string; // YYYY-MM-DD
  status: MedicationStatus;
  verificationStatus: VerificationStatus;
  notes?: string;
  verifiedWith?: 'QR' | 'Barcode' | 'Manual' | 'Visual';
  verificationCodeScanned?: string;
  ownerUid?: string;
}

export interface Alert {
  id: string;
  patientId: string;
  medicineId?: string;
  medicineName?: string;
  alertType: 'MISSED_DOSE' | 'WRONG_MEDICINE' | 'HIGH_RISK_DETECTED' | 'REFILL_NEEDED' | 'LATE_DOSE';
  message: string;
  priority: AlertPriority;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  actionTaken?: string;
  ownerUid?: string;
}

export interface CaregiverContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary?: boolean;
  alertLevel?: 'ALL' | 'CRITICAL_ONLY' | 'ESCALATED';
  notificationLevel?: 'ALL' | 'CRITICAL_ONLY' | 'ESCALATED';
  active?: boolean;
  ownerUid?: string;
}

export type Caregiver = CaregiverContact;

export interface PatientProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  age: number;
  gender: string;
  bloodGroup: string;
  conditionSummary?: string;
  medicalConditions?: string[];
  allergies?: string[];
  emergencyContact?: string;
  timezone?: string;
  ownerUid?: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  preferredLanguage?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  caregiverName?: string;
  caregiverRelationship?: string;
  caregiverPhone?: string;
  caregiverEmail?: string;
  doctorSpecialization?: string;
  doctorClinic?: string;
  doctorPhone?: string;
  doctorName?: string;
}

export interface AppSettings {
  earlyReminderMinutes: number;
  lateThresholdMinutes: number;
  missedThresholdMinutes: number;
  requireVerification: boolean;
  audioAlerts: boolean;
  reminderSound?: 'soft-chime' | 'gentle-bell' | 'calm-alert' | 'digital-beep' | 'soft-pulse';
  voiceReminders: boolean;
  simulatedTimeOffsetMinutes: number; // For demo time travel
  currentSimulatedDate?: string;
  caregivers?: CaregiverContact[];
}

export interface AdherenceMetrics {
  overallScore: number;
  onTimeRate: number;
  lateDoseRate: number;
  missedDoseRate: number;
  verificationSuccessRate: number;
  totalScheduled: number;
  totalTakenOnTime: number;
  totalTakenLate: number;
  totalMissed: number;
  totalPending: number;
  takenOnTime: number;
  takenLate: number;
  missed: number;
  riskLevel: RiskLevel;
  riskScore: number; // 0 - 100 (higher = riskier)
  detectedPatterns: string[];
  recommendations: string[];
  timeOfDayPerformance?: {
    morning: { scheduled: number; taken: number; adherence: number };
    afternoon: { scheduled: number; taken: number; adherence: number };
    evening: { scheduled: number; taken: number; adherence: number };
    night: { scheduled: number; taken: number; adherence: number };
  };
  timeOfDayCompliance: {
    Morning: { score: number; total: number; onTime: number };
    Afternoon: { score: number; total: number; onTime: number };
    Evening: { score: number; total: number; onTime: number };
    Night: { score: number; total: number; onTime: number };
  };
  dailyTrend: {
    date: string;
    score: number;
    taken: number;
    late: number;
    missed: number;
  }[];
  medicineWise?: {
    id: string;
    name: string;
    total: number;
    adherence: number;
    missed: number;
  }[];
  medicineAdherence: {
    medicineId: string;
    medicineName: string;
    totalScheduled: number;
    onTime: number;
    late: number;
    missed: number;
    score: number;
  }[];
}
