export type RescheduleDecision = 'accept' | 'reject';

export const MINIMUM_DOCTOR_GAP_MS = 30 * 60 * 1000;

export const canCreateRescheduleProposal = (status: string) =>
  status === 'confirmed' || status === 'reschedule_pending';

export const getDoctorSlotConflictWindow = (scheduledAt: Date) => ({
  after: new Date(scheduledAt.getTime() - MINIMUM_DOCTOR_GAP_MS),
  before: new Date(scheduledAt.getTime() + MINIMUM_DOCTOR_GAP_MS),
});

export const resolveRescheduleDecision = (decision: RescheduleDecision) =>
  decision === 'accept'
    ? { proposalStatus: 'accepted' as const, appointmentStatus: 'confirmed' as const }
    : { proposalStatus: 'rejected' as const, appointmentStatus: 'reschedule_pending' as const };