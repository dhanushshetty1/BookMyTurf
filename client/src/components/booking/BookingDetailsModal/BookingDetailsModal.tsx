import React from 'react';
import { 
  Calendar, CheckCircle2, Clock3, IndianRupee, MapPin, 
  Share2, Trophy, Users, X, ExternalLink
} from 'lucide-react';
import styles from './BookingDetailsModal.module.css';
import { formatDate } from '../../../utils/formatDate';

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: {
    booking?: any;
    turfName?: string;
    courtName?: string;
    courtType?: string;
    location?: string;
    mapsUrl?: string;
    date?: string;
    timeRange?: string;
    amount?: number;
    bookingType?: 'FULL' | 'HALF';
  } | null;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ isOpen, onClose, bookingData }) => {
  if (!isOpen || !bookingData) return null;

  const details = bookingData;
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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        <section className={styles.confirmation}>
          <div className={styles.successMark} aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 88 88">
              <circle className={styles.successCircle} cx="44" cy="44" r="34" />
              <path className={styles.successCheck} d="M30 45.5 40 55 59 34" />
            </svg>
          </div>

          <p className={styles.eyebrow}>Booking Details</p>
          <h2 className={styles.title}>Slot secured!</h2>
          
          <div className={styles.ticket}>
            <div className={styles.ticketHeader}>
              <div>
                <span className={styles.ticketLabel}>Booking Code</span>
                <strong>{bookingCode}</strong>
              </div>
              <span className={styles.statusPill}>
                <CheckCircle2 size={14} />
                Confirmed
              </span>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <Trophy size={16} />
                <div className={styles.detailText}>
                  <span>Venue</span>
                  <strong>{details.turfName || 'Your turf'}</strong>
                </div>
              </div>
              <div className={styles.detailItem}>
                <Users size={16} />
                <div className={styles.detailText}>
                  <span>Court</span>
                  <strong>{details.courtName || details.courtType || 'Selected court'}{details.bookingType === 'HALF' ? ' - Half court' : ''}</strong>
                </div>
              </div>
              <div className={styles.detailItem}>
                <Calendar size={16} />
                <div className={styles.detailText}>
                  <span>Date</span>
                  <strong>{formatDate(details.date) || 'Confirmed date'}</strong>
                </div>
              </div>
              <div className={styles.detailItem}>
                <Clock3 size={16} />
                <div className={styles.detailText}>
                  <span>Time</span>
                  <strong>{details.timeRange || 'Selected slot'}</strong>
                </div>
              </div>
              <div className={styles.detailItem}>
                <MapPin size={16} />
                <div className={styles.detailText}>
                  <span>Location</span>
                  <strong>{details.location || 'Venue location'}</strong>
                </div>
              </div>
              <div className={styles.detailItem}>
                <IndianRupee size={16} />
                <div className={styles.detailText}>
                  <span>Amount</span>
                  <strong>{details.amount ? `Rs ${details.amount.toLocaleString()}` : 'Paid online'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.entryCard}>
            <div className={styles.qrBox} aria-hidden="true">
              <span></span><span></span><span></span><span></span>
              <i></i><i></i><i></i><i></i><i></i>
            </div>
            <div>
              <h3>Entry pass</h3>
              <p>Show this code at the venue when you arrive.</p>
            </div>
          </div>

          <div className={styles.actions}>
            {details.mapsUrl && (
              <a href={details.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.primaryAction}>
                <ExternalLink size={18} />
                Get Directions
              </a>
            )}
            <button type="button" className={styles.secondaryAction} onClick={handleShare}>
              <Share2 size={18} />
              Invite Teammates
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
