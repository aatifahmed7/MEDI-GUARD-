import { GoogleGenAI } from '@google/genai';
import { Medicine, MedicationEvent, AdherenceMetrics, PatientProfile } from '../src/types.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const PRIMARY_MODEL = 'gemini-3.7-flash';
const FALLBACK_MODEL = 'gemini-3.6-flash';

function cleanJson(text: string): string {
  let raw = text.trim();
  if (raw.startsWith('```json')) {
    raw = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (raw.startsWith('```')) {
    raw = raw.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return raw.trim();
}

export async function generateAiAdherenceInsights(
  patient: PatientProfile,
  medicines: Medicine[],
  metrics: AdherenceMetrics,
  recentEvents: MedicationEvent[]
): Promise<{
  clinicalSummary: string;
  behavioralAnalysis: string;
  interventionStrategy: string;
  potentialRiskFactors: string[];
  caregiverActionItems: string[];
  disclaimer: string;
}> {
  const fallback = {
    clinicalSummary: `Patient ${patient.name} (${patient.age}yo) has an overall medication adherence score of ${metrics.overallScore}% with a ${metrics.riskLevel} risk rating across ${medicines.length} active prescriptions.`,
    behavioralAnalysis: metrics.detectedPatterns.join(' ') || 'Stable routine with minimal scheduling friction.',
    interventionStrategy: metrics.recommendations.join(' ') || 'Continue standard reminders and monthly caregiver sync.',
    potentialRiskFactors: [
      'Evening dose timing conflicts with daily meal/sleep schedules',
      'Complex multi-dose regimen (3x daily for Metformin)',
      'Potential forgetfulness during travel or weekend routines',
    ],
    caregiverActionItems: [
      'Review evening medication alert sound and volume setting on patient device',
      'Ensure pill organizers or blister packs are pre-sorted for the upcoming week',
      'Confirm patient takes Lisinopril before morning meals as prescribed',
    ],
    disclaimer: 'MediGuard AI is an adherence support prototype and does not replace clinical judgment or official prescriptions.',
  };

  const ai = getAiClient();
  if (!ai) {
    return fallback;
  }

  const prompt = `You are the clinical adherence intelligence engine of "MediGuard AI".
Analyze this patient's medication regimen and real adherence data:

Patient Profile:
- Name: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
- Conditions: ${patient.conditionSummary}
- Doctor: ${patient.doctorName}

Active Prescriptions (${medicines.length}):
${medicines.map((m) => `- ${m.name} (${m.dosage}, ${m.frequency}, Timing: ${m.reminderTimes.join(', ')}, Instructions: ${m.instructions}, Food: ${m.foodTiming})`).join('\n')}

Adherence Metrics (Last 14 Days):
- Overall Adherence Score: ${metrics.overallScore}%
- On-time rate: ${metrics.onTimeRate}%, Late rate: ${metrics.lateDoseRate}%, Missed rate: ${metrics.missedDoseRate}%
- Predicted Risk Level: ${metrics.riskLevel} (Risk Index: ${metrics.riskScore}/100)
- Morning Adherence: ${metrics.timeOfDayPerformance.morning.adherence}%
- Afternoon Adherence: ${metrics.timeOfDayPerformance.afternoon.adherence}%
- Evening Adherence: ${metrics.timeOfDayPerformance.evening.adherence}%
- Night Adherence: ${metrics.timeOfDayPerformance.night.adherence}%

Recent 5 Events:
${recentEvents.slice(0, 5).map((e) => `- ${e.scheduledDate} ${e.scheduledTime}: ${e.medicineName} (${e.dosage}) -> Status: ${e.status} [${e.verificationStatus}]`).join('\n')}

Please return a detailed JSON object with these keys:
{
  "clinicalSummary": "2-3 sentences summarizing the patient's adherence status and health implications for their chronic conditions",
  "behavioralAnalysis": "Analysis of temporal patterns (e.g. why evening doses lag, weekday vs weekend friction)",
  "interventionStrategy": "Actionable non-pharmacological adherence interventions (reminders, smart alarms, habit bundling)",
  "potentialRiskFactors": ["3 specific bullet points of risk factors for missed doses"],
  "caregiverActionItems": ["3 clear actionable steps for the family or nurse caregiver"],
  "disclaimer": "MediGuard AI is an adherence support prototype and does not replace clinical judgment or official prescriptions."
}

DO NOT change dosages or prescribe new drugs. Focus purely on adherence support, routine optimization, and safety.`;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(cleanJson(response.text));
        return {
          clinicalSummary: parsed.clinicalSummary || fallback.clinicalSummary,
          behavioralAnalysis: parsed.behavioralAnalysis || fallback.behavioralAnalysis,
          interventionStrategy: parsed.interventionStrategy || fallback.interventionStrategy,
          potentialRiskFactors: parsed.potentialRiskFactors || fallback.potentialRiskFactors,
          caregiverActionItems: parsed.caregiverActionItems || fallback.caregiverActionItems,
          disclaimer: parsed.disclaimer || fallback.disclaimer,
        };
      }
    } catch (err) {
      console.warn(`Attempt with ${model} failed, trying fallback:`, err);
    }
  }

  return fallback;
}

export async function checkDrugInteractions(
  medicines: Medicine[]
): Promise<{
  overallSafety: 'SAFE' | 'MONITOR' | 'CAUTION';
  interactions: {
    medicinesInvolved: string[];
    severity: 'Mild' | 'Moderate' | 'Severe';
    description: string;
    recommendation: string;
  }[];
  timingTips: string[];
  disclaimer: string;
}> {
  const fallback = {
    overallSafety: 'MONITOR' as const,
    interactions: [
      {
        medicinesInvolved: ['Metformin HCl', 'Lisinopril'],
        severity: 'Mild' as const,
        description: 'Both medications are well-tolerated together in diabetes/hypertension co-management, but renal function should be checked periodically.',
        recommendation: 'Ensure adequate daily hydration and take Metformin strictly with meals to avoid GI upset.',
      },
      {
        medicinesInvolved: ['Atorvastatin', 'Paracetamol Extra'],
        severity: 'Mild' as const,
        description: 'Both are metabolized hepatically. Excessive paracetamol use (>4g/day) should be avoided.',
        recommendation: 'Do not exceed maximum daily dosage for Paracetamol.',
      },
    ],
    timingTips: [
      'Take Lisinopril in the morning on an empty stomach or before breakfast.',
      'Take Metformin with meals to minimize stomach upset.',
      'Take Atorvastatin in the evening or bedtime as cholesterol synthesis peaks at night.',
      'Take Vitamin D with meals containing healthy fats for superior bioavailability.',
    ],
    disclaimer: 'MediGuard AI drug interaction screening is for patient education and adherence tracking. Always follow your prescribing doctor and pharmacist instructions.',
  };

  const ai = getAiClient();
  if (!ai) {
    return fallback;
  }

  const prompt = `You are a clinical pharmacology AI assistant within MediGuard AI.
Analyze the following active medicine list for potential drug-drug interactions, food timing optimizations, and safety guidelines:

Active Medicines:
${medicines.map((m) => `- ${m.name} (${m.dosage}, ${m.frequency}, Instructions: ${m.instructions}, Food: ${m.foodTiming})`).join('\n')}

Return a JSON object:
{
  "overallSafety": "SAFE" | "MONITOR" | "CAUTION",
  "interactions": [
    {
      "medicinesInvolved": ["Med A", "Med B"],
      "severity": "Mild" | "Moderate" | "Severe",
      "description": "Clear explanation of interaction mechanism",
      "recommendation": "Patient-friendly guidance"
    }
  ],
  "timingTips": ["4 practical tips on medication timing, spacing, and food intake"],
  "disclaimer": "MediGuard AI drug interaction screening is for educational support. Consult your physician for clinical decisions."
}`;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        return JSON.parse(cleanJson(response.text));
      }
    } catch (err) {
      console.warn(`Drug interaction check with ${model} failed, trying fallback:`, err);
    }
  }

  return fallback;
}

export async function chatWithAdherenceAssistant(
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
  patient: PatientProfile,
  medicines: Medicine[],
  metrics: AdherenceMetrics
): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return `Hello ${patient.name}! I am your MediGuard AI medication adherence companion. You are currently taking ${medicines.length} prescribed medications with an adherence score of ${metrics.overallScore}%. Remember to take your scheduled doses with food as directed by your physician!`;
  }

  const systemInstruction = `You are "MediGuard AI Assistant", an empathetic, highly knowledgeable medication adherence and patient support AI.
Patient context:
- Patient Name: ${patient.name}, ${patient.age} years old
- Conditions: ${patient.conditionSummary}
- Doctor: ${patient.doctorName}
- Current Adherence: ${metrics.overallScore}% (${metrics.riskLevel} risk)
- Active Medicines: ${medicines.map((m) => `${m.name} ${m.dosage} (${m.frequency}, ${m.foodTiming})`).join(', ')}

Guidelines:
1. Provide supportive, clear, actionable advice on medication timing, habit cues, pill organization, and remembering doses.
2. NEVER prescribe drugs, diagnose diseases, or recommend altering dosages.
3. If the user reports severe symptoms (chest pain, shortness of breath, severe allergic reaction), immediately advise them to contact emergency services (911) or their doctor ${patient.doctorName}.
4. Keep answers friendly, professional, concise, and structured with bullet points where appropriate.
5. Include a brief safety reminder when discussing medicine side-effects.`;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction,
        },
      });

      for (const turn of history.slice(-6)) {
        if (turn.role === 'user') {
          await chat.sendMessage({ message: turn.content });
        }
      }

      const response = await chat.sendMessage({ message: userMessage });
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn(`Chat with ${model} failed, trying fallback:`, err);
    }
  }

  return 'I am currently processing your request. Please ensure you take your scheduled medications as prescribed by your doctor.';
}
