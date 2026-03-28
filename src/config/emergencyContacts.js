/**
 * Emergency contacts (same campus list as Public Resources / SOS card).
 * `number`: digits for tel: / dialer; `displayNumber`: shown in UI.
 */
export const EMERGENCY_CONTACTS = [
  {
    label: 'University Counselling Center',
    number: '0800202800',
    displayNumber: '0800-202-800',
  },
  {
    label: 'Allan Galpin Health Center',
    number: '0800200141',
    displayNumber: '0800-200-141',
  },
  {
    label: 'Security',
    number: '080200142',
    displayNumber: '080-200-142',
  },
];

/** @param {{ number: string }} contact */
export function emergencyTelHref(contact) {
  return `tel:${contact.number.replace(/\D/g, '')}`;
}

/** @param {{ number: string, displayNumber?: string }} contact */
export function emergencyDisplayNumber(contact) {
  return contact.displayNumber ?? contact.number;
}
