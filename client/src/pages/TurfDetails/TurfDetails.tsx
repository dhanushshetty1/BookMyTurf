import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, Clock, CreditCard, ArrowLeft, Sun, Sunset, Moon, 
  ChevronLeft, ChevronRight, MapPin, Share2, Car, Bath, Coffee, 
  Wifi, ShieldCheck, Check
} from 'lucide-react';
import LoadingScreen from '../../components/common/LoadingScreen';
import { turfService } from '../../services/turfService';
import { paymentService } from '../../services/paymentService';
import { CONFIG, IMAGE_BASE_URL } from '../../config';
import styles from './TurfDetails.module.css';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { formatTime } from '../../utils/formatTime';
import { formatDateLabel, toIsoDateKey } from '../../utils/formatDate';
import BookingDetailsModal from '../../components/booking/BookingDetailsModal/BookingDetailsModal';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const loadRazorpayCheckout = () => {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const getFacilityIcon = (facility: string) => {
  const f = facility.toLowerCase();
  if (f.includes('parking')) return <Car size={16} />;
  if (f.includes('washroom') || f.includes('toilet')) return <Bath size={16} />;
  if (f.includes('cafeteria') || f.includes('food')) return <Coffee size={16} />;
  if (f.includes('wifi')) return <Wifi size={16} />;
  return <CheckCircle size={16} />;
};

const getFirstDisplayDate = (court: any) => {
  const slots = [...(court?.slots || [])].sort((a: any, b: any) => {
    return new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime();
  });
  const firstAvailable = slots.find((slot: any) => slot.status === 'AVAILABLE');
  const firstSlot = firstAvailable || slots[0];
  return firstSlot ? toIsoDateKey(firstSlot.startTimeUTC) : null;
};

const getSlotTimeRange = (slot: any) => {
  if (!slot) return '';
  const start = slot.startTimeUTC || slot.startTime;
  const end = slot.endTimeUTC || slot.endTime;
  return `${formatTime(start)} - ${formatTime(end)}`;
};

const getCourtImageUrl = (court: any, turf: any) => {
  const image = court?.images?.[0] || turf?.images?.[0];
  return image
    ? `${IMAGE_BASE_URL}${image}`
    : 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1470&auto=format&fit=crop';
};

const TurfDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCourtId = searchParams.get('courtId');
  const [turf, setTurf] = useState<any>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<null | 'pending' | 'success'>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<'FULL' | 'HALF'>('FULL');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successBookingData, setSuccessBookingData] = useState<any>(null);
  const [courtSportFilter, setCourtSportFilter] = useState('All');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const fetchTurfDetails = (isInitial = false) => {
    if (id) {
      turfService.getTurfById(id)
        .then(data => {
          setTurf(data);
          if (isInitial) {
            const activeCourts = data.courts?.filter((c: any) => c.status === 'ACTIVE') || [];
            const requestedCourt = requestedCourtId
              ? activeCourts.find((court: any) => court.id === requestedCourtId)
              : null;

            if (requestedCourt) {
              setSelectedCourtId(requestedCourt.id);
              setSelectedDate(getFirstDisplayDate(requestedCourt));
            } else if (activeCourts.length === 1) {
              const onlyActiveCourt = activeCourts[0];
              setSelectedCourtId(onlyActiveCourt.id);
              setSelectedDate(getFirstDisplayDate(onlyActiveCourt));
            } else {
              setSelectedCourtId(null);
              setSelectedDate(null);
            }
          }
        })
        .catch(err => {
          console.error(err);
          setError('Failed to load turf details.');
        });
    }
  };

  useEffect(() => {
    fetchTurfDetails(true);
  }, [id, requestedCourtId]);

  const courts = turf?.courts || [];
  const activeCourts = courts.filter((court: any) => court.status === 'ACTIVE');
  const shouldChooseCourtFirst = activeCourts.length > 1;
  const courtSportFilters = ['All', ...Array.from(new Set(activeCourts.map((court: any) => court.type).filter(Boolean)))] as string[];
  const visibleCourts = courtSportFilter === 'All'
    ? activeCourts
    : activeCourts.filter((court: any) => court.type === courtSportFilter);
  const hasActiveCourts = activeCourts.length > 0;
  const selectedCourt = courts.find((c: any) => c.id === selectedCourtId);
  const selectedCourtIsActive = selectedCourt?.status === 'ACTIVE';
  const isWeekendDate = (dateStr: string | null) => {
    if (!dateStr) return false;
    const day = new Date(`${dateStr}T00:00:00`).getDay();
    return day === 0 || day === 6;
  };
  const getCourtRateForDate = (court: any, dateStr: string | null) => {
    if (!court) return 0;
    if (isWeekendDate(dateStr)) {
      return court.weekendPricePerHour || court.pricePerHour || 0;
    }
    return court.pricePerHour || 0;
  };
  const getHalfCourtRateForDate = (court: any, dateStr: string | null) => {
    if (!court?.allowHalfCourtBooking) return null;
    if (isWeekendDate(dateStr)) {
      return court.halfCourtWeekendPricePerHour || court.halfCourtPricePerHour || Math.ceil((court.weekendPricePerHour || court.pricePerHour || 0) / 2);
    }
    return court.halfCourtPricePerHour || Math.ceil((court.pricePerHour || 0) / 2);
  };
  const getBookingRateForDate = (court: any, dateStr: string | null) => {
    return bookingType === 'HALF'
      ? getHalfCourtRateForDate(court, dateStr) || getCourtRateForDate(court, dateStr)
      : getCourtRateForDate(court, dateStr);
  };
  const isSlotBookable = (slot: any) => {
    if (!slot) return false;
    if (slot.status === 'AVAILABLE') return true;
    return slot.status === 'PARTIALLY_BOOKED' && selectedCourt?.allowHalfCourtBooking && bookingType === 'HALF';
  };
  const selectSlot = (slot: any) => {
    if (slot.status === 'PARTIALLY_BOOKED' && selectedCourt?.allowHalfCourtBooking) {
      setBookingType('HALF');
    }
    setSelectedSlotId(slot.id);
  };
  const activeRate = selectedCourtIsActive ? getCourtRateForDate(selectedCourt, selectedDate) : null;
  const activeHalfRate = selectedCourtIsActive ? getHalfCourtRateForDate(selectedCourt, selectedDate) : null;
  const selectedBookingRate = selectedCourtIsActive ? getBookingRateForDate(selectedCourt, selectedDate) : 0;
  const activeRateLabel = isWeekendDate(selectedDate) ? 'Weekend rate' : 'Weekday rate';

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!selectedCourtIsActive) {
      setError('This court is currently closed for booking.');
      return;
    }
    if (!selectedSlotId) {
      setError('Please select a time slot first');
      return;
    }

    setError('');
    setBookingStatus('pending');

    try {
      const bookingSlot = selectedCourt.slots.find((s: any) => s.id === selectedSlotId);
      const checkoutLoaded = await loadRazorpayCheckout();

      if (!checkoutLoaded) {
        throw new Error('Could not load the payment gateway. Please check your internet connection.');
      }

      if (!CONFIG.RAZORPAY_KEY_ID) {
        throw new Error('Payment gateway is not configured.');
      }

      const order = await paymentService.createOrder({
        turfId: turf.id,
        courtId: selectedCourtId!,
        slotId: selectedSlotId,
        bookingType,
      });

      const options = {
        key: order.key || CONFIG.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: order.name || 'BookMyTurf',
        description: order.description || 'Turf booking payment',
        order_id: order.orderId,
        prefill: order.prefill,
        theme: {
          color: '#16a34a',
        },
        modal: {
          ondismiss: async () => {
            await paymentService.cancelPayment(order.bookingId, 'Checkout popup closed by user');
            setBookingStatus(null);
            fetchTurfDetails();
          },
        },
        handler: async (response: any) => {
          try {
            const verified = await paymentService.verifyPayment({
              bookingId: order.bookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setBookingStatus('success');
            setSuccessBookingData({
              booking: verified.booking,
              turfId: turf.id,
              turfName: turf.name,
              courtName: selectedCourt?.name,
              courtType: selectedCourt?.type,
              location: turf.location,
              mapsUrl: turf.googleMapsUrl,
              date: selectedDate || toIsoDateKey(bookingSlot.startTimeUTC || bookingSlot.date),
              timeRange: getSlotTimeRange(bookingSlot),
              amount: order.displayAmount,
              bookingType,
            });
            setIsSuccessModalOpen(true);
            setSelectedSlotId(null);
            fetchTurfDetails();
          } catch (verifyError: any) {
            setError(verifyError.response?.data?.message || 'Payment verification failed.');
            setBookingStatus(null);
            fetchTurfDetails();
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', async (response: any) => {
        await paymentService.cancelPayment(order.bookingId, response?.error?.description || 'Payment failed');
        setError(response?.error?.description || 'Payment failed. Please try again.');
        setBookingStatus(null);
        fetchTurfDetails();
      });
      razorpay.open();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to start payment.');
      setBookingStatus(null);
    }
  };

  if (!turf && !error) return <LoadingScreen message="Gathering turf details..." />;
  if (error && !turf) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  const allSlots = selectedCourtIsActive ? selectedCourt?.slots || [] : [];
  const slotsByDate: { [key: string]: any[] } = {};
  allSlots.forEach((slot: any) => {
    const d = toIsoDateKey(slot.startTimeUTC);
    if (!slotsByDate[d]) slotsByDate[d] = [];
    slotsByDate[d].push(slot);
  });

  const availableDates = Object.keys(slotsByDate).sort();
  const currentDateSlots = selectedDate
    ? [...(slotsByDate[selectedDate] || [])].sort((a: any, b: any) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime())
    : [];

  const morningSlots = currentDateSlots.filter((s: any) => new Date(s.startTimeUTC).getHours() < 12);
  const afternoonSlots = currentDateSlots.filter((s: any) => {
    const hour = new Date(s.startTimeUTC).getHours();
    return hour >= 12 && hour < 17;
  });
  const eveningSlots = currentDateSlots.filter((s: any) => new Date(s.startTimeUTC).getHours() >= 17);

  const selectedSlot = allSlots.find((s: any) => s.id === selectedSlotId);

  const getDayName = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  const getDateNumber = (dateStr: string) => new Date(dateStr).getDate();

  return (
    <div className={styles.container} data-theme="light">
      <div className={styles.topNav}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className={styles.header}>
        <div className={styles.imagePlaceholder} style={{ 
          backgroundImage: turf.images?.length > 0 ? `url(${IMAGE_BASE_URL}${turf.images[0]})` : `url(https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1470&auto=format&fit=crop)`,
        }}></div>
        <div className={styles.heroOverlay}></div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainInfo}>
          <div className={styles.venueHeader}>
            <div>
              <p className={styles.eyebrow}>Book your slot</p>
              <h1>{turf.name}</h1>
              <p className={styles.location}>
                <MapPin size={18} />
                {turf.location}
              </p>
            </div>

            <div className={styles.headerActions}>
              {turf.googleMapsUrl && (
                <a
                  href={turf.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.actionBtn} ${styles.actionBtnGreen}`}
                >
                  <MapPin size={18} /> Get Directions
                </a>
              )}
              <button className={styles.actionBtn} onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: turf.name,
                    text: `Check out ${turf.name} on BookMyTurf!`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}>
                <Share2 size={18} /> Share
              </button>
            </div>
          </div>

          <div className={styles.quickInfo}>
            <div className={styles.facilities}>
              {turf.facilities?.map((f: string, i: number) => (
                <span key={i} className={styles.tag}>
                  {getFacilityIcon(f)}
                  {f}
                </span>
              ))}
            </div>

            <div className={styles.facilityStatusBadge}>
              <span className={turf.status === 'ACTIVE' ? styles.statusActiveDot : styles.statusInactiveDot}></span>
              {turf.status === 'ACTIVE' ? 'Open for booking' : `Status: ${turf.status}`}
            </div>
          </div>

          <div className={styles.description}>
            <h2>About this turf</h2>
            <p className={styles.addressText}>{turf.address || 'Premium facility with top-notch amenities.'}</p>
          </div>

          {shouldChooseCourtFirst && !selectedCourtId && (
          <section className={styles.courtSelector}>
             <div className={styles.courtSelectorTop}>
               <div>
                 <p className={styles.eyebrow}>Choose court</p>
                 <h2>Courts at {turf.name}</h2>
                 <p>Choose a court to view available dates and slots.</p>
               </div>
               <div className={styles.courtSummaryPill}>
                 <strong>{activeCourts.length}</strong>
                 <span>active courts</span>
               </div>
             </div>
             {courtSportFilters.length > 2 && (
               <div className={styles.courtTabs} aria-label="Filter courts by sport">
                 {courtSportFilters.map((sport) => (
                   <button
                     key={sport}
                     type="button"
                     className={courtSportFilter === sport ? styles.courtTabActive : ''}
                     onClick={() => setCourtSportFilter(sport)}
                   >
                     {sport}
                   </button>
                 ))}
               </div>
             )}
             <div className={styles.courtList}>
                {visibleCourts.length > 0 ? visibleCourts.map((court: any) => {
                  const availableSlotCount = court.slots?.filter((slot: any) => slot.status === 'AVAILABLE').length || 0;
                  const isSelected = selectedCourtId === court.id;
                  return (
                  <button
                    type="button"
                    key={court.id} 
                    className={`${styles.courtOption} ${isSelected ? styles.courtOptionSelected : ''}`}
                    onClick={() => {
                      setSelectedCourtId(court.id);
                      setSelectedSlotId(null);
                      setBookingType('FULL');
                      setSelectedDate(getFirstDisplayDate(court));
                    }}
                  >
                    <span
                      className={styles.courtCardImage}
                      style={{ backgroundImage: `url(${getCourtImageUrl(court, turf)})` }}
                    />
                    <span className={styles.courtCardBody}>
                      <span className={styles.courtChipRow}>
                        <span className={styles.courtTypeChip}>{court.type}</span>
                      </span>
                      <span className={styles.courtCardTitle}>{court.name}</span>
                      <span className={styles.courtCardLocation}>
                        <MapPin size={18} />
                        {turf.location}
                      </span>
                      <span className={styles.courtCardMeta}>
                        <span>
                          <Clock size={17} />
                          {availableSlotCount} slots
                        </span>
                        <span>
                          <ShieldCheck size={17} />
                          Verified
                        </span>
                      </span>
                      <span className={styles.courtCardCta}>Book Now</span>
                    </span>
                  </button>
                );
                }) : (
                  <div className={styles.closedNotice}>
                    <h3>No courts listed yet</h3>
                    <p>This turf has not added courts for online booking.</p>
                  </div>
                )}
             </div>
          </section>
          )}

          {!hasActiveCourts ? (
            <section className={`${styles.bookingCard} ${styles.closedPanel}`}>
              <div className={styles.closedPanelIcon}>
                <Clock size={28} />
              </div>
              <h2>Sorry, we are closed for online booking right now.</h2>
              <p>The owner has temporarily closed all courts at this turf. Please check back later or choose another turf.</p>
            </section>
          ) : shouldChooseCourtFirst && !selectedCourtId ? null : !selectedCourtIsActive ? (
            <section className={`${styles.bookingCard} ${styles.closedPanel}`}>
              <div className={styles.closedPanelIcon}>
                <Clock size={28} />
              </div>
              <h2>This court is currently closed.</h2>
              <p>Select an active court above to view dates and book a slot.</p>
            </section>
          ) : (
          <section className={styles.bookingCard}>
            {shouldChooseCourtFirst && (
              <button
                type="button"
                className={styles.backToCourtsBtn}
                onClick={() => {
                  if (requestedCourtId) {
                    navigate('/turfs');
                    return;
                  }
                  setSelectedCourtId(null);
                  setSelectedSlotId(null);
                  setBookingType('FULL');
                  setSelectedDate(null);
                }}
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            <div className={styles.price}>
              <span className={styles.amount}>Rs {selectedBookingRate || activeRate || selectedCourt.pricePerHour}</span>
              <span className={styles.priceLabel}>/ hour</span>
              {selectedCourt?.allowHalfCourtBooking && (
                <div className={styles.bookingTypeToggle} aria-label="Choose full court or half court">
                  <button
                    type="button"
                    className={bookingType === 'FULL' ? styles.bookingTypeActive : ''}
                    onClick={() => {
                      setBookingType('FULL');
                      if (selectedSlot?.status === 'PARTIALLY_BOOKED') setSelectedSlotId(null);
                    }}
                  >
                    Full court
                    <small>Rs {activeRate}</small>
                  </button>
                  <button
                    type="button"
                    className={bookingType === 'HALF' ? styles.bookingTypeActive : ''}
                    onClick={() => setBookingType('HALF')}
                  >
                    Half court
                    <small>Rs {activeHalfRate}</small>
                  </button>
                </div>
              )}
              <div className={styles.selectedCourtName}>
                {selectedCourt?.name} | {activeRateLabel}
              </div>
            </div>

            <div className={styles.slots}>
              <div className={styles.dateSelector}>
                <h4>Select Date</h4>
                <div className={styles.sliderWrapper}>
                  <button className={styles.navBtn} onClick={() => scroll('left')}><ChevronLeft size={18} /></button>
                  <div className={styles.dateListContainer} ref={scrollRef}>
                    {availableDates.length > 0 ? availableDates.map(date => (
                      <div
                        key={date}
                        className={`${styles.dateItem} ${selectedDate === date ? styles.activeDate : ''}`}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedSlotId(null);
                        }}
                      >
                        <span className={styles.day}>{getDayName(date)}</span>
                        <span className={styles.date}>{getDateNumber(date)}</span>
                      </div>
                    )) : <p className={styles.emptyInline}>No online booking dates are open for this court right now.</p>}
                  </div>
                  <button className={styles.navBtn} onClick={() => scroll('right')}><ChevronRight size={18} /></button>
                </div>
              </div>

              <h3>Available Slots</h3>
              {currentDateSlots.length > 0 ? (
                <>
                  {morningSlots.length > 0 && (
                    <div className={styles.timeGroup}>
                      <div className={styles.timeGroupTitle}><Sun size={16} /> Morning</div>
                      <div className={styles.slotGrid}>
                        {morningSlots.map(slot => (
                          <button 
                            key={slot.id} 
                            className={`${styles.slotBtn} ${selectedSlotId === slot.id ? styles.selected : ''} ${slot.status === 'PARTIALLY_BOOKED' ? styles.partialSlot : ''} ${slot.status === 'BOOKED' || slot.status === 'BLOCKED' ? styles.unavailable : ''}`} 
                            onClick={() => selectSlot(slot)}
                            disabled={!isSlotBookable(slot)}
                          >
                            <span className={styles.slotTime}>{getSlotTimeRange(slot)}</span>
                            {slot.status === 'PARTIALLY_BOOKED' && <span className={styles.slotState}>Half booked</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {afternoonSlots.length > 0 && (
                    <div className={styles.timeGroup}>
                      <div className={styles.timeGroupTitle}><Sunset size={16} /> Afternoon</div>
                      <div className={styles.slotGrid}>
                        {afternoonSlots.map(slot => (
                          <button 
                            key={slot.id} 
                            className={`${styles.slotBtn} ${selectedSlotId === slot.id ? styles.selected : ''} ${slot.status === 'PARTIALLY_BOOKED' ? styles.partialSlot : ''} ${slot.status === 'BOOKED' || slot.status === 'BLOCKED' ? styles.unavailable : ''}`} 
                            onClick={() => selectSlot(slot)}
                            disabled={!isSlotBookable(slot)}
                          >
                            <span className={styles.slotTime}>{getSlotTimeRange(slot)}</span>
                            {slot.status === 'PARTIALLY_BOOKED' && <span className={styles.slotState}>Half booked</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {eveningSlots.length > 0 && (
                    <div className={styles.timeGroup}>
                      <div className={styles.timeGroupTitle}><Moon size={16} /> Evening</div>
                      <div className={styles.slotGrid}>
                        {eveningSlots.map(slot => (
                          <button 
                            key={slot.id} 
                            className={`${styles.slotBtn} ${selectedSlotId === slot.id ? styles.selected : ''} ${slot.status === 'PARTIALLY_BOOKED' ? styles.partialSlot : ''} ${slot.status === 'BOOKED' || slot.status === 'BLOCKED' ? styles.unavailable : ''}`} 
                            onClick={() => selectSlot(slot)}
                            disabled={!isSlotBookable(slot)}
                          >
                            <span className={styles.slotTime}>{getSlotTimeRange(slot)}</span>
                            {slot.status === 'PARTIALLY_BOOKED' && <span className={styles.slotState}>Half booked</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.noSlotsNotice}>
                  <Clock size={20} />
                  <div>
                    <strong>Sorry, this court is closed for online booking right now.</strong>
                    <p>No slots are available for the selected date. Please check another court or try again later.</p>
                  </div>
                </div>
              )}
            </div>

            {selectedSlot && (
              <div className={styles.bookingSummary}>
                <div className={styles.summaryLine}>
                  <Check size={16} className={styles.emeraldText} />
                  <span>{bookingType === 'HALF' ? 'Half court' : 'Full court'} selected: <strong>Rs {selectedBookingRate}</strong></span>
                </div>
                <p className={styles.timeLabel}>{getSlotTimeRange(selectedSlot)}</p>
              </div>
            )}

            {error && <p className={styles.errorMessage}>{error}</p>}


            {bookingStatus === 'pending' && <div className={styles.statusBox}><Clock className={styles.spinning} /><p>Processing...</p></div>}

          </section>
          )}
        </div>
      </div>

      {selectedSlot && (
        <div className={styles.stickyFooter}>
          <div className={styles.footerInfo}>
            <div className={styles.footerSelection}>
              Selected: <strong>{selectedDate ? formatDateLabel(`${selectedDate}T00:00:00`) : 'Selected date'}, {getSlotTimeRange(selectedSlot)}</strong>
            </div>
            <div className={styles.footerTotal}>
              Total amount: <span>Rs {selectedBookingRate}</span>
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleBooking}
            style={{ minWidth: '260px', padding: '1rem 1.25rem', fontSize: '1rem' }}
          >
            <CreditCard size={20} style={{ marginRight: '12px' }} />
            {isAuthenticated ? 'PAY & BOOK NOW' : 'LOGIN TO BOOK'}
          </button>
        </div>
      )}
      <BookingDetailsModal 
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        bookingData={successBookingData}
      />
    </div>
  );
};

export default TurfDetails;
