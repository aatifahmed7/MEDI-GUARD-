import { MedicationEvent, Medicine, AdherenceMetrics, RiskLevel } from '../src/types.js';

export function calculateAdherenceMetrics(events: MedicationEvent[], medicines: Medicine[]): AdherenceMetrics {
  // Only evaluate completed/past events (Taken on Time, Taken Late, Missed)
  const evaluated = events.filter(
    (e) => e.status === 'Taken on Time' || e.status === 'Taken Late' || e.status === 'Missed'
  );

  const pending = events.filter((e) => e.status === 'Pending' || e.status === 'Upcoming' || e.status === 'Due Now');

  const totalScheduled = evaluated.length;
  if (totalScheduled === 0) {
    return {
      overallScore: 100,
      onTimeRate: 100,
      lateDoseRate: 0,
      missedDoseRate: 0,
      verificationSuccessRate: 100,
      totalScheduled: 0,
      totalTakenOnTime: 0,
      totalTakenLate: 0,
      totalMissed: 0,
      totalPending: pending.length,
      takenOnTime: 0,
      takenLate: 0,
      missed: 0,
      riskLevel: 'LOW',
      riskScore: 5,
      detectedPatterns: ['No past medication events recorded yet. Ready for first intake.'],
      recommendations: ['Maintain standard scheduled reminder notifications.'],
      timeOfDayPerformance: {
        morning: { scheduled: 0, taken: 0, adherence: 100 },
        afternoon: { scheduled: 0, taken: 0, adherence: 100 },
        evening: { scheduled: 0, taken: 0, adherence: 100 },
        night: { scheduled: 0, taken: 0, adherence: 100 },
      },
      timeOfDayCompliance: {
        Morning: { score: 100, total: 0, onTime: 0 },
        Afternoon: { score: 100, total: 0, onTime: 0 },
        Evening: { score: 100, total: 0, onTime: 0 },
        Night: { score: 100, total: 0, onTime: 0 },
      },
      dailyTrend: [],
      medicineWise: medicines.map((m) => ({
        id: m.id,
        name: m.name,
        total: 0,
        adherence: 100,
        missed: 0,
      })),
      medicineAdherence: medicines.map((m) => ({
        medicineId: m.id,
        medicineName: m.name,
        totalScheduled: 0,
        onTime: 0,
        late: 0,
        missed: 0,
        score: 100,
      })),
    };
  }

  const takenOnTime = evaluated.filter((e) => e.status === 'Taken on Time').length;
  const takenLate = evaluated.filter((e) => e.status === 'Taken Late').length;
  const missed = evaluated.filter((e) => e.status === 'Missed').length;

  const totalTaken = takenOnTime + takenLate;
  const verified = evaluated.filter((e) => e.verificationStatus === 'Verified').length;

  // Adherence formula: On-time (1.0), Late (0.6), Missed (0)
  const overallScore = Math.round(((takenOnTime * 1.0 + takenLate * 0.6) / totalScheduled) * 100);
  const onTimeRate = Math.round((takenOnTime / totalScheduled) * 100);
  const lateDoseRate = Math.round((takenLate / totalScheduled) * 100);
  const missedDoseRate = Math.round((missed / totalScheduled) * 100);
  const verificationSuccessRate = totalTaken > 0 ? Math.round((verified / totalTaken) * 100) : 100;

  // Time of Day performance
  const timeOfDay = {
    morning: { scheduled: 0, taken: 0, adherence: 100 },
    afternoon: { scheduled: 0, taken: 0, adherence: 100 },
    evening: { scheduled: 0, taken: 0, adherence: 100 },
    night: { scheduled: 0, taken: 0, adherence: 100 },
  };

  const timeOfDayCompliance = {
    Morning: { score: 100, total: 0, onTime: 0 },
    Afternoon: { score: 100, total: 0, onTime: 0 },
    Evening: { score: 100, total: 0, onTime: 0 },
    Night: { score: 100, total: 0, onTime: 0 },
  };

  evaluated.forEach((e) => {
    const [h] = e.scheduledTime.split(':').map(Number);
    let slot: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
    let cSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Night' = 'Morning';

    if (h >= 5 && h < 12) {
      slot = 'morning';
      cSlot = 'Morning';
    } else if (h >= 12 && h < 17) {
      slot = 'afternoon';
      cSlot = 'Afternoon';
    } else if (h >= 17 && h < 21) {
      slot = 'evening';
      cSlot = 'Evening';
    } else {
      slot = 'night';
      cSlot = 'Night';
    }

    timeOfDay[slot].scheduled++;
    timeOfDayCompliance[cSlot].total++;

    if (e.status === 'Taken on Time') {
      timeOfDay[slot].taken += 1.0;
      timeOfDayCompliance[cSlot].onTime++;
    } else if (e.status === 'Taken Late') {
      timeOfDay[slot].taken += 0.6;
    }
  });

  Object.keys(timeOfDay).forEach((key) => {
    const k = key as keyof typeof timeOfDay;
    if (timeOfDay[k].scheduled > 0) {
      timeOfDay[k].adherence = Math.round((timeOfDay[k].taken / timeOfDay[k].scheduled) * 100);
    }
  });

  (['Morning', 'Afternoon', 'Evening', 'Night'] as const).forEach((k) => {
    const item = timeOfDayCompliance[k];
    if (item.total > 0) {
      const slotEvents = evaluated.filter((e) => {
        const [h] = e.scheduledTime.split(':').map(Number);
        if (k === 'Morning') return h >= 5 && h < 12;
        if (k === 'Afternoon') return h >= 12 && h < 17;
        if (k === 'Evening') return h >= 17 && h < 21;
        return h >= 21 || h < 5;
      });
      const onTime = slotEvents.filter((e) => e.status === 'Taken on Time').length;
      const late = slotEvents.filter((e) => e.status === 'Taken Late').length;
      item.score = Math.round(((onTime * 1.0 + late * 0.6) / slotEvents.length) * 100);
    }
  });

  // Daily Trend (Group by Date)
  const dateMap = new Map<string, { taken: number; late: number; missed: number; total: number }>();
  evaluated.forEach((e) => {
    if (!dateMap.has(e.scheduledDate)) {
      dateMap.set(e.scheduledDate, { taken: 0, late: 0, missed: 0, total: 0 });
    }
    const rec = dateMap.get(e.scheduledDate)!;
    rec.total++;
    if (e.status === 'Taken on Time') rec.taken++;
    else if (e.status === 'Taken Late') rec.late++;
    else if (e.status === 'Missed') rec.missed++;
  });

  const sortedDates = Array.from(dateMap.keys()).sort();
  const dailyTrend = sortedDates.map((date) => {
    const item = dateMap.get(date)!;
    const score = Math.round(((item.taken * 1.0 + item.late * 0.6) / item.total) * 100);
    return {
      date,
      score,
      taken: item.taken,
      late: item.late,
      missed: item.missed,
    };
  });

  // Medicine-wise performance
  const medicineWise = medicines.map((m) => {
    const medEvents = evaluated.filter((e) => e.medicineId === m.id);
    if (medEvents.length === 0) {
      return {
        id: m.id,
        name: m.name,
        total: 0,
        adherence: 100,
        missed: 0,
      };
    }
    const medTaken = medEvents.filter((e) => e.status === 'Taken on Time').length;
    const medLate = medEvents.filter((e) => e.status === 'Taken Late').length;
    const medMissed = medEvents.filter((e) => e.status === 'Missed').length;
    const medScore = Math.round(((medTaken * 1.0 + medLate * 0.6) / medEvents.length) * 100);
    return {
      id: m.id,
      name: m.name,
      total: medEvents.length,
      adherence: medScore,
      missed: medMissed,
    };
  });

  const medicineAdherence = medicines.map((m) => {
    const medEvents = evaluated.filter((e) => e.medicineId === m.id);
    const onTime = medEvents.filter((e) => e.status === 'Taken on Time').length;
    const late = medEvents.filter((e) => e.status === 'Taken Late').length;
    const missedCount = medEvents.filter((e) => e.status === 'Missed').length;
    const score =
      medEvents.length > 0
        ? Math.round(((onTime * 1.0 + late * 0.6) / medEvents.length) * 100)
        : 100;
    return {
      medicineId: m.id,
      medicineName: m.name,
      totalScheduled: medEvents.length,
      onTime,
      late,
      missed: missedCount,
      score,
    };
  });

  // Risk Score calculation (0 - 100, higher is riskier)
  let riskScore = 100 - overallScore;

  // Check recent 3 days trend
  const recentDays = dailyTrend.slice(-3);
  if (recentDays.length > 0) {
    const recentAvg = Math.round(recentDays.reduce((acc, d) => acc + d.score, 0) / recentDays.length);
    if (recentAvg < overallScore - 10) {
      riskScore += 15; // Downtrend penalty
    }
  }

  // Consecutive missed check in recent events
  const sortedEvents = [...evaluated].sort((a, b) => (b.scheduledDate + b.scheduledTime).localeCompare(a.scheduledDate + a.scheduledTime));
  let consecutiveMisses = 0;
  for (const ev of sortedEvents) {
    if (ev.status === 'Missed') consecutiveMisses++;
    else break;
  }
  if (consecutiveMisses >= 2) {
    riskScore += 25;
  } else if (consecutiveMisses === 1) {
    riskScore += 10;
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 35 || overallScore < 75) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 18 || overallScore < 88) {
    riskLevel = 'MODERATE';
  }

  // Pattern detection
  const detectedPatterns: string[] = [];
  const recommendations: string[] = [];

  if (timeOfDay.evening.adherence < timeOfDay.morning.adherence - 15) {
    detectedPatterns.push(
      `Evening adherence (${timeOfDay.evening.adherence}%) is significantly lower than morning adherence (${timeOfDay.morning.adherence}%). Evening friction detected.`
    );
    recommendations.push('Configure an early secondary reminder 15 minutes before the evening dose window.');
  }

  if (timeOfDay.night.scheduled > 0 && timeOfDay.night.adherence < 80) {
    detectedPatterns.push(`Bedtime doses are frequently delayed or missed (${timeOfDay.night.adherence}% adherence).`);
    recommendations.push('Synchronize nighttime medication alert with the patient’s regular sleep preparation routine.');
  }

  const lowestMed = [...medicineWise].sort((a, b) => a.adherence - b.adherence)[0];
  if (lowestMed && lowestMed.adherence < 85 && lowestMed.total >= 3) {
    detectedPatterns.push(`Specific adherence challenge identified with ${lowestMed.name} (${lowestMed.adherence}% adherence, ${lowestMed.missed} missed).`);
    recommendations.push(`Review administration convenience and side effects for ${lowestMed.name} with the prescribing physician.`);
  }

  if (consecutiveMisses >= 1) {
    detectedPatterns.push(`Recent missed dose event detected within the last 48 hours.`);
    recommendations.push('Immediate caregiver notification recommended if next scheduled dose is delayed beyond 30 minutes.');
  }

  if (detectedPatterns.length === 0) {
    detectedPatterns.push('Consistent and stable medication adherence pattern observed across all time windows.');
    recommendations.push('Continue standard scheduled alerts and monthly adherence audit.');
  }

  return {
    overallScore,
    onTimeRate,
    lateDoseRate,
    missedDoseRate,
    verificationSuccessRate,
    totalScheduled,
    totalTakenOnTime: takenOnTime,
    totalTakenLate: takenLate,
    totalMissed: missed,
    totalPending: pending.length,
    takenOnTime,
    takenLate,
    missed,
    riskLevel,
    riskScore,
    detectedPatterns,
    recommendations,
    timeOfDayPerformance: timeOfDay,
    timeOfDayCompliance,
    dailyTrend,
    medicineWise,
    medicineAdherence,
  };
}
