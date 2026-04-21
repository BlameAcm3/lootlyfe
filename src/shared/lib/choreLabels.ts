/** Human-readable labels for chore instance lifecycle states. */
export const formatChoreInstanceStatus = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'To do';
    case 'completed_unverified':
      return 'Needs approval';
    case 'completed_verified':
      return 'Approved';
    default:
      return status.replace(/_/g, ' ');
  }
};
