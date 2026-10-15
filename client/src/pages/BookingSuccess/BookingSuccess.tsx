import { Calendar, CheckCircle2, Clock3, IndianRupee, MapPin, Share2, Trophy, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './BookingSuccess.module.css';
import { formatDate } from '../../utils/formatDate';

type BookingSuccessState = {
  booking?: any;
  turfId?: string;
  turfName?: string;
  courtName?: string;
  courtType?: string;
  location?: string;
  mapsUrl?: string;
  date?: string;
  timeRange?: string;
  amount?: number;
};

const BookingSuccess = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const details = (state || {}) as BookingSuccessState;
  const bookingCode = details.booking?.bookingCode || (details.booking?.id ? String(details.booking.id).slice(-8).toUpperCase() : 'BOOKED');

  const handleShare = async () => {
    const text = `Booking confirmed at ${details.turfName || 'BookMyTurf'}${details.timeRange ? ` for ${details.timeRange}` : ''}.`;

    if (navigator.share) {
      await navigator.share({
        title: 'BookMyTurf booking confirmed',
        text,
        url: window.location.origin + '/dashboard',
      });
      return;
    }

    await navigator.clipboard.writeText(text);
    alert('Booking details copied.');
  };

  return (
    <main className={styles.page} data-theme="light">
      <section className={styles.confirmation}>
        <div className={styles.successMark} aria-hidden="true">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle className={styles.successCircle} cx="44" cy="44" r="34" />
            <path className={styles.successCheck} d="M30 45.5 40 55 59 34" />
          </svg>
        </div>

        <p className={styles.eyebrow}>Payment successful</p>
        <h1>Slot secured!</h1>
        <p className={styles.lead}>
          Your booking is confirmed. Keep this page handy and show the booking code at the venue if asked.
        </p>

        <div className={styles.ticket}>
          <div className={styles.ticketHeader}>
            <div>
              <span className={styles.ticketLabel}>Booking Code</span>
              <strong>{bookingCode}</strong>
            </div>
            <span className={styles.statusPill}>
              <CheckCircle2 size={16} />
              Confirmed
            </span>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <Trophy size={18} />
              <span>Venue</span>
              <strong>{details.turfName || 'Your turf'}</strong>
            </div>
            <div className={styles.detailItem}>
              <Users size={18} />
              <span>Court</span>
              <strong>{details.courtName || details.courtType || 'Selected court'}</strong>
            </div>
            <div className={styles.detailItem}>
              <Calendar size={18} />
              <span>Date</span>
              <strong>{formatDate(details.date) || 'Confirmed date'}</strong>
            </div>
            <div className={styles.detailItem}>
              <Clock3 size={18} />
              <span>Time</span>
              <strong>{details.timeRange || 'Selected slot'}</strong>
            </div>
            <div className={styles.detailItem}>
              <MapPin size={18} />
              <span>Location</span>
              <strong>{details.location || 'Venue location'}</strong>
            </div>
            <div className={styles.detailItem}>
              <IndianRupee size={18} />
              <span>Amount Paid</span>
              <strong>{details.amount ? `Rs ${details.amount.toLocaleString()}` : 'Paid online'}</strong>
            </div>
          </div>
        </div>

        <div className={styles.entryCard}>
          <div className={styles.qrBox} aria-hidden="true">
            <span></span><span></span><span></span><span></span>
            <i></i><i></i><i></i><i></i><i></i>
          </div>
          <div>
            <h2>Entry pass</h2>
            <p>Show this confirmation from your phone when you arrive for the slot.</p>
          </div>
        </div>

        <div className={styles.actions}>
          {details.mapsUrl && (
            <a href={details.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.primaryAction}>
              <MapPin size={18} />
              Get Directions
            </a>
          )}
          <button type="button" className={styles.secondaryAction} onClick={handleShare}>
            <Share2 size={18} />
            Invite Teammates
          </button>
          <button type="button" className={styles.ghostAction} onClick={() => navigate('/dashboard')}>
            View My Bookings
          </button>
        </div>
      </section>
    </main>
  );
};

export default BookingSuccess;
