/**
 * Converts a 24-hour time string (HH:mm) to a 12-hour format with AM/PM.
 * Example: "14:30" -> "2:30 PM", "09:00" -> "9:00 AM"
 */
export const formatTime = (timeInput: string | Date): string => {
  if (!timeInput) return '';
  
  let date: Date;

  if (timeInput instanceof Date) {
    date = timeInput;
  } else if (timeInput.includes('T') || timeInput.includes('-')) {
    date = new Date(timeInput);
  } else {
    // Handle HH:mm format
    const [hoursStr, minutesStr] = timeInput.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (isNaN(hours) || isNaN(minutes)) return timeInput;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${hours12}:${formattedMinutes} ${ampm}`;
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${hours12}:${formattedMinutes} ${ampm}`;
};
