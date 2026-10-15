import React, { useEffect, useState, useRef, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Search, MapPin, LocateFixed, Clock3, ShieldCheck } from 'lucide-react';
import { turfService } from '../../services/turfService';
import { useSelector } from 'react-redux';
import { type RootState } from '../../store';
import styles from './Home.module.css';
import LoadingScreen from '../../components/common/LoadingScreen';
import { IMAGE_BASE_URL } from '../../config';
import HeroTurfScene from '../../components/hero/HeroTurfScene';

const Home: React.FC = () => {
  const [turfs, setTurfs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [featuredProgress, setFeaturedProgress] = useState(0);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const listingSearchRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLElement>(null);
  const featuredProgressRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideListingSearch = listingSearchRef.current?.contains(target);
      if (!isInsideListingSearch) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'OWNER') {
      navigate('/owner');
      return;
    }

    turfService.getAllTurfs()
      .then(data => setTurfs(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const updateProgress = () => {
      if (!featuredRef.current) return;

      const rect = featuredRef.current.getBoundingClientRect();
      const scrollDistance = Math.max(rect.height - window.innerHeight, 1);
      const rawProgress = -rect.top / scrollDistance;
      const nextProgress = Math.min(Math.max(rawProgress, 0), 1);

      if (Math.abs(nextProgress - featuredProgressRef.current) > 0.004) {
        featuredProgressRef.current = nextProgress;
        setFeaturedProgress(nextProgress);
      }
    };

    let frameId = 0;
    const handleScroll = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const filteredTurfs = turfs.filter((turf) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return `${turf.name} ${turf.location}`.toLowerCase().includes(query);
  });

  const featuredTurfs = filteredTurfs.slice(0, 6);

  const getSports = (turf: any) => {
    const sports = turf.courts?.map((court: any) => court.type).filter(Boolean) || [];
    return Array.from(new Set(sports)).slice(0, 3);
  };

  const suggestions = turfs
    .filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(() => searchTerm.trim() !== '')
    .slice(0, 5);

  const handleSuggestionClick = (turf: any) => {
    setSearchTerm(turf.name);
    setShowSuggestions(false);
  };

  const handleExploreTurfs = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    featuredRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={styles.container}
      data-theme="light"
      style={{ '--scroll-progress': featuredProgress } as CSSProperties}
    >
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>Book sports turfs near you</h1>
          <p className={styles.heroText}>Find courts, compare live prices, choose slots, and confirm your next game in one fast flow.</p>
          <div className={styles.heroActions}>
            <a href="#available-turfs" className={styles.primaryCta} onClick={handleExploreTurfs}>
              Explore turfs <ArrowRight size={18} />
            </a>
            <Link to="/turfs" className={styles.secondaryCta}>
              View all courts
            </Link>
          </div>
          <div className={styles.trustLine}>
            <span><CalendarCheck size={16} /> Fast booking</span>
            <span><ShieldCheck size={16} /> Verified courts</span>
            <span><Clock3 size={16} /> Easy reschedule</span>
          </div>
        </div>

        <div className={styles.turfPreview} aria-hidden="true">
          <HeroTurfScene />
        </div>
      </section>

      {/* Turf Listing Section */}
      <section
        ref={featuredRef}
        className={styles.featured}
        id="available-turfs"
      >
        <div className={styles.featuredSticky}>
          <div className={styles.featuredBackdrop} aria-hidden="true"></div>
          <div className={styles.sectionHeader}>
            <div className={styles.headerLeft}>
              <div>
                <p className={styles.eyebrow}>Featured courts</p>
                <h2 className={styles.mainTitle}>Available Turfs</h2>
              </div>
              
              <div className={styles.searchContainer} ref={listingSearchRef}>
                <div className={styles.searchBar}>
                  <div className={styles.searchGroup}>
                    <Search className={styles.searchIcon} size={20} />
                    <input
                      type="text"
                      placeholder="Search by location or turf name..."
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                  </div>
                  
                  <button className={styles.locateBtn} title="Locate Me" type="button">
                    <LocateFixed size={20} />
                  </button>

                  <button className={styles.searchBtn} type="button">
                    <span>Search</span>
                  </button>
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className={styles.suggestionsDropdown}>
                    {suggestions.map((suggestion) => (
                      <div 
                        key={suggestion.id} 
                        className={styles.suggestionItem}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className={styles.suggestionInfo}>
                          <span className={styles.suggestionName}>{suggestion.name}</span>
                          <span className={styles.suggestionLocation}>{suggestion.location}</span>
                        </div>
                        <Search size={14} className={styles.suggestionIcon} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

          <div className={styles.grid}>
            {isLoading ? (
              <div style={{ height: '300px' }}>
                <LoadingScreen fullScreen={false} message="Finding the best turfs..." />
              </div>
            ) : featuredTurfs.length === 0 ? (
               <p>No turfs found. Check back later!</p>
            ) : featuredTurfs.map((turf) => (
              <div
                key={turf.id}
                className={styles.turfCard}
              >
                <div className={styles.imageContainer}>
                  <div className={styles.cardImage} style={{ 
                    backgroundImage: turf.images?.length > 0 ? `url(${IMAGE_BASE_URL}${turf.images[0]})` : `url(https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1470&auto=format&fit=crop)`,
                  }}></div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.sportRow}>
                    {getSports(turf).map((sport: any) => (
                      <span key={sport} className={styles.sportChip}>{sport}</span>
                    ))}
                  </div>
                  <h3 className={styles.turfName}>{turf.name}</h3>
                  <p className={styles.turfLocation}>
                    <MapPin size={16} /> {turf.location}
                  </p>
                  <div className={styles.cardMeta}>
                    <span><Clock3 size={15} /> Today slots</span>
                    <span><ShieldCheck size={15} /> Verified</span>
                  </div>
                  <Link to={`/turfs/${turf.id}`} className="btn-primary" style={{ width: '100%', display: 'inline-block', textAlign: 'center', boxSizing: 'border-box' }}>
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
