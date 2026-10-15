import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, Grid2X2, ListFilter, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import LoadingScreen from '../../components/common/LoadingScreen';
import { turfService } from '../../services/turfService';
import { IMAGE_BASE_URL } from '../../config';
import styles from './Turfs.module.css';

const SPORT_FILTERS = ['All', 'Cricket', 'Football', 'Tennis', 'Pickleball'];

const normalizeSport = (value: string) => value.toLowerCase().replace(/\s+/g, '');

const Turfs: React.FC = () => {
  const [turfs, setTurfs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSport, setActiveSport] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    turfService.getAllTurfs()
      .then(data => setTurfs(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const courtRows = useMemo(() => {
    return turfs.flatMap((turf) => {
      const activeCourts = turf.courts?.filter((court: any) => court.status !== 'INACTIVE') || [];

      return activeCourts.map((court: any) => ({
        id: `${turf.id}-${court.id}`,
        turfId: turf.id,
        courtId: court.id,
        turfName: turf.name,
        location: turf.location,
        image: turf.images?.[0],
        courtName: court.name,
        sport: court.type,
        pricePerHour: court.pricePerHour,
        weekendPricePerHour: court.weekendPricePerHour,
        facilities: turf.facilities || [],
        slots: court.slots || [],
      }));
    });
  }, [turfs]);

  const filteredRows = courtRows.filter((row) => {
    const matchesSport = activeSport === 'All' || normalizeSport(row.sport) === normalizeSport(activeSport);
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || `${row.turfName} ${row.courtName} ${row.location} ${row.sport}`.toLowerCase().includes(query);
    return matchesSport && matchesSearch;
  });

  const availableSlots = filteredRows.reduce((total, row) => {
    return total + row.slots.filter((slot: any) => slot.status === 'AVAILABLE').length;
  }, 0);

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Find your court</p>
            <h1>Available Turfs</h1>
            <p>Compare sports, courts, pricing, and book the turf that fits your next game.</p>
          </div>
          <div className={styles.headerMetrics}>
            <span className={styles.countBadge}>{filteredRows.length} courts</span>
            <span className={styles.slotBadge}>{availableSlots} open slots</span>
          </div>
        </header>

        <section className={styles.marketHero}>
          <div className={styles.marketCopy}>
            <span className={styles.livePill}><CalendarCheck size={15} /> Open slots near you</span>
            <h2>Pick the right surface before you pay.</h2>
            <p>Scan price, sport type, location, and availability without opening every venue.</p>
          </div>
          <div className={styles.modeSwitch} aria-label="View mode">
            <button type="button" className={styles.modeActive} title="List view"><ListFilter size={18} /></button>
            <button type="button" title="Card view"><Grid2X2 size={18} /></button>
          </div>
        </section>

        <section className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search turf, court, sport or location..."
            />
          </div>

          <div className={styles.filters} aria-label="Filter by sport">
            <span className={styles.filterLabel}><SlidersHorizontal size={16} /> Filters</span>
            {SPORT_FILTERS.map((sport) => (
              <button
                key={sport}
                type="button"
                className={`${styles.filterBtn} ${activeSport === sport ? styles.filterBtnActive : ''}`}
                onClick={() => setActiveSport(sport)}
              >
                {sport}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.tableHeader}>
            <span>Turf & Court</span>
            <span>Sport</span>
            <span>Location</span>
            <span>Price</span>
            <span>Action</span>
          </div>

          {isLoading ? (
            <div className={styles.loadingWrap}>
              <LoadingScreen fullScreen={false} message="Loading turfs..." />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarCheck size={34} />
              <h2>No courts found</h2>
              <p>Try another sport filter or search term.</p>
            </div>
          ) : (
            <div className={styles.rows}>
              {filteredRows.map((row) => (
                <article key={row.id} className={styles.row}>
                  <div className={styles.primaryCell}>
                    <div className={styles.thumb} style={{
                      backgroundImage: row.image
                        ? `url(${IMAGE_BASE_URL}${row.image})`
                        : 'url(https://images.unsplash.com/photo-1556056504-5c7696c4c28d?q=80&w=1200&auto=format&fit=crop)',
                    }} />
                    <div>
                      <Link to={`/turfs/${row.turfId}`} className={styles.turfName}>
                        {row.turfName}
                      </Link>
                      <span className={styles.courtName}>{row.courtName}</span>
                    </div>
                  </div>

                  <div>
                    <span className={styles.sportBadge}>{row.sport}</span>
                  </div>

                  <div className={styles.locationCell}>
                    <MapPin size={16} />
                    <span>{row.location}</span>
                  </div>

                  <div className={styles.priceCell}>
                    <strong>Rs {row.pricePerHour}/hr</strong>
                    {row.weekendPricePerHour && row.weekendPricePerHour !== row.pricePerHour && (
                      <span>Weekend Rs {row.weekendPricePerHour}/hr</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.bookBtn}
                    onClick={() => navigate(`/turfs/${row.turfId}?courtId=${row.courtId}`)}
                  >
                    Book
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Turfs;
